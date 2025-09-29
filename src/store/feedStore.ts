import { create } from 'zustand';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { Subscription, Article, FeedData } from '@shared/types';
const READ_ARTICLES_STORAGE_KEY = 'aura-reader-read-articles';
const getInitialReadArticleIds = (): Set<string> => {
  try {
    const item = localStorage.getItem(READ_ARTICLES_STORAGE_KEY);
    if (item) {
      return new Set(JSON.parse(item));
    }
  } catch (error) {
    console.error('Failed to parse read articles from localStorage', error);
  }
  return new Set();
};
interface FeedState {
  subscriptions: Subscription[];
  articlesBySubId: Map<string, Article[]>;
  articles: Article[]; // Articles for the currently selected feed
  selectedSubscriptionId: string | null;
  selectedArticleId: string | null;
  isInitialLoading: boolean;
  isLoadingArticles: boolean;
  isFetchingAll: boolean;
  refreshingSubscriptionIds: Set<string>;
  readArticleIds: Set<string>;
  fetchSubscriptions: () => Promise<void>;
  selectSubscription: (id: string | null) => Promise<void>;
  selectArticle: (id: string | null) => void;
  addSubscription: (url: string) => Promise<Subscription | null>;
  updateSubscription: (sub: Subscription) => Promise<Subscription | null>;
  removeSubscription: (id: string) => Promise<void>;
  markFeedAsRead: () => void;
  clearReadArticlesInFeed: () => void;
  refreshSubscription: (id: string) => Promise<void>;
  fetchAllArticles: () => Promise<void>;
}
export const useFeedStore = create<FeedState>((set, get) => ({
  subscriptions: [],
  articlesBySubId: new Map(),
  articles: [],
  selectedSubscriptionId: null,
  selectedArticleId: null,
  isInitialLoading: true,
  isLoadingArticles: false,
  isFetchingAll: false,
  refreshingSubscriptionIds: new Set(),
  readArticleIds: getInitialReadArticleIds(),
  fetchSubscriptions: async () => {
    set({ isInitialLoading: true });
    try {
      const subs = await api<Subscription[]>('/api/subscriptions');
      set({ subscriptions: subs, isInitialLoading: false });
    } catch (error) {
      toast.error('Failed to load subscriptions.');
      set({ isInitialLoading: false });
    }
  },
  selectSubscription: async (id) => {
    if (get().selectedSubscriptionId === id && id !== null) return;
    set({
      selectedSubscriptionId: id,
      selectedArticleId: null,
      isLoadingArticles: !!id,
    });
    if (!id) {
      set({ articles: [], isLoadingArticles: false });
      return;
    }
    // On-demand fetch articles if not already loaded
    if (!get().articlesBySubId.has(id)) {
      const sub = get().subscriptions.find(s => s.id === id);
      if (sub) {
        try {
          const feedData = await api<FeedData>(`/api/proxy-feed?url=${encodeURIComponent(sub.url)}`);
          set(state => {
            const newArticlesBySubId = new Map(state.articlesBySubId);
            newArticlesBySubId.set(id, feedData.items);
            return { articlesBySubId: newArticlesBySubId };
          });
        } catch (error) {
          toast.error(`Could not fetch articles for ${sub.title}.`);
        }
      }
    }
    const articlesForSub = get().articlesBySubId.get(id) || [];
    set({ articles: articlesForSub, isLoadingArticles: false });
  },
  selectArticle: (id) => {
    if (get().selectedArticleId === id) return;
    if (id) {
      const newReadArticleIds = new Set(get().readArticleIds);
      newReadArticleIds.add(id);
      try {
        localStorage.setItem(READ_ARTICLES_STORAGE_KEY, JSON.stringify(Array.from(newReadArticleIds)));
      } catch (error) {
        console.error('Failed to save read articles to localStorage', error);
      }
      set({ readArticleIds: newReadArticleIds });
    }
    set({ selectedArticleId: id });
  },
  addSubscription: async (url) => {
    try {
      const newSubscription = await api<Subscription>('/api/subscriptions', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      set((state) => ({
        subscriptions: [...state.subscriptions, newSubscription],
      }));
      toast.success(`Subscribed to ${newSubscription.title}!`);
      // Fetch articles for the new subscription
      get().refreshSubscription(newSubscription.id);
      return newSubscription;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast.error(`Failed to add feed: ${errorMessage}`);
      return null;
    }
  },
  updateSubscription: async (sub) => {
    try {
      const updatedSub = await api<Subscription>(`/api/subscriptions/${sub.id}`, {
        method: 'PUT',
        body: JSON.stringify({ url: sub.url, title: sub.title }),
      });
      set(state => ({
        subscriptions: state.subscriptions.map(s => s.id === updatedSub.id ? updatedSub : s),
      }));
      toast.success(`Updated "${updatedSub.title}".`);
      return updatedSub;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast.error(`Failed to update feed: ${errorMessage}`);
      return null;
    }
  },
  removeSubscription: async (id) => {
    const originalSubscriptions = get().subscriptions;
    const subToRemove = originalSubscriptions.find(s => s.id === id);
    set((state) => {
      const newArticlesBySubId = new Map(state.articlesBySubId);
      newArticlesBySubId.delete(id);
      return {
        subscriptions: state.subscriptions.filter((sub) => sub.id !== id),
        articlesBySubId: newArticlesBySubId,
        ...(state.selectedSubscriptionId === id && {
          selectedSubscriptionId: null,
          selectedArticleId: null,
          articles: [],
        }),
      };
    });
    try {
      await api(`/api/subscriptions/${id}`, { method: 'DELETE' });
      toast.success(`Unsubscribed from ${subToRemove?.title || 'feed'}.`);
    } catch (error) {
      toast.error('Failed to remove subscription.');
      set({ subscriptions: originalSubscriptions }); // Revert on failure
    }
  },
  markFeedAsRead: () => {
    const { articles, readArticleIds } = get();
    if (articles.length === 0) return;
    const newReadArticleIds = new Set(readArticleIds);
    articles.forEach(article => newReadArticleIds.add(article.id));
    try {
      localStorage.setItem(READ_ARTICLES_STORAGE_KEY, JSON.stringify(Array.from(newReadArticleIds)));
    } catch (error) {
      console.error('Failed to save read articles to localStorage', error);
    }
    set({ readArticleIds: newReadArticleIds });
    toast.success('All articles marked as read.');
  },
  clearReadArticlesInFeed: () => {
    const { articles, readArticleIds, selectedSubscriptionId } = get();
    if (!selectedSubscriptionId) return;
    const readArticlesInCurrentFeed = articles.filter(a => readArticleIds.has(a.id));
    if (readArticlesInCurrentFeed.length === 0) return;
    const unreadArticles = articles.filter(a => !readArticleIds.has(a.id));
    set(state => {
      const newArticlesBySubId = new Map(state.articlesBySubId);
      newArticlesBySubId.set(selectedSubscriptionId, unreadArticles);
      return {
        articles: unreadArticles,
        articlesBySubId: newArticlesBySubId,
      };
    });
    toast.success(`${readArticlesInCurrentFeed.length} read article(s) cleared from view.`);
  },
  refreshSubscription: async (id) => {
    const sub = get().subscriptions.find(s => s.id === id);
    if (!sub) return;
    set(state => ({
      refreshingSubscriptionIds: new Set(state.refreshingSubscriptionIds).add(id),
    }));
    try {
      const feedData = await api<FeedData>(`/api/proxy-feed?url=${encodeURIComponent(sub.url)}`);
      set(state => {
        const newArticlesBySubId = new Map(state.articlesBySubId);
        newArticlesBySubId.set(id, feedData.items);
        const newState: Partial<FeedState> = { articlesBySubId: newArticlesBySubId };
        // If this is the currently selected subscription, update its articles list too
        if (state.selectedSubscriptionId === id) {
          newState.articles = feedData.items;
        }
        return newState;
      });
      toast.success(`"${sub.title}" has been refreshed.`);
    } catch (error) {
      toast.error(`Failed to refresh "${sub.title}".`);
      console.error(`Failed to refresh feed ${id}:`, error);
    } finally {
      set(state => {
        const newRefreshingIds = new Set(state.refreshingSubscriptionIds);
        newRefreshingIds.delete(id);
        return { refreshingSubscriptionIds: newRefreshingIds };
      });
    }
  },
  fetchAllArticles: async () => {
    set({ isFetchingAll: true });
    const { subscriptions } = get();
    const articlePromises = subscriptions.map(sub =>
      api<FeedData>(`/api/proxy-feed?url=${encodeURIComponent(sub.url)}`)
        .then(feedData => ({ id: sub.id, articles: feedData.items, status: 'fulfilled' as const }))
        .catch(error => {
          console.error(`Failed to fetch articles for ${sub.title}`, error);
          return { id: sub.id, articles: get().articlesBySubId.get(sub.id) || [], status: 'rejected' as const };
        })
    );
    const results = await Promise.all(articlePromises);
    const newArticlesBySubId = new Map<string, Article[]>();
    let failedCount = 0;
    results.forEach(result => {
      newArticlesBySubId.set(result.id, result.articles);
      if (result.status === 'rejected') failedCount++;
    });
    set(state => {
      const newState: Partial<FeedState> = {
        articlesBySubId: newArticlesBySubId,
        isFetchingAll: false,
      };
      // If a subscription is selected, update its article list
      if (state.selectedSubscriptionId) {
        newState.articles = newArticlesBySubId.get(state.selectedSubscriptionId) || [];
      }
      return newState;
    });
    if (failedCount > 0) {
      toast.warning(`Finished refreshing. Could not update ${failedCount} feed(s).`);
    } else {
      toast.success('All feeds have been refreshed.');
    }
  },
}));