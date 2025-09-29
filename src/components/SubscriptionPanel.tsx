import { PlusCircle, Rss, Trash2, Pencil, RefreshCw } from 'lucide-react';
import { useFeedStore } from '@/store/feedStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Subscription } from '@shared/types';
interface SubscriptionPanelProps {
  onAddFeed: () => void;
  onEditFeed: (subscription: Subscription) => void;
}
export function SubscriptionPanel({ onAddFeed, onEditFeed }: SubscriptionPanelProps) {
  const subscriptions = useFeedStore((state) => state.subscriptions);
  const selectedSubscriptionId = useFeedStore((state) => state.selectedSubscriptionId);
  const articlesBySubId = useFeedStore((state) => state.articlesBySubId);
  const readArticleIds = useFeedStore((state) => state.readArticleIds);
  const selectSubscription = useFeedStore((state) => state.selectSubscription);
  const removeSubscription = useFeedStore((state) => state.removeSubscription);
  const isLoading = useFeedStore((state) => state.isInitialLoading);
  const refreshSubscription = useFeedStore((state) => state.refreshSubscription);
  const refreshingSubscriptionIds = useFeedStore((state) => state.refreshingSubscriptionIds);
  const fetchAllArticles = useFeedStore((state) => state.fetchAllArticles);
  const isFetchingAll = useFeedStore((state) => state.isFetchingAll);
  const handleRemove = (id: string) => {
    removeSubscription(id);
  };
  const handleRefresh = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    refreshSubscription(id);
  };
  const getUnreadCount = (subId: string): number => {
    const articles = articlesBySubId.get(subId) || [];
    return articles.filter(article => !readArticleIds.has(article.id)).length;
  };
  return (
    <div className="flex h-full flex-col bg-muted/20">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Rss className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">Feeds</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchAllArticles}
            disabled={isFetchingAll}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("h-4 w-4", isFetchingAll && "animate-spin")} />
            <span className="sr-only">Refresh All Feeds</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={onAddFeed} className="h-8 w-8">
            <PlusCircle className="h-5 w-5" />
            <span className="sr-only">Add Feed</span>
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground p-4">
              No feeds yet. Click the '+' to add one.
            </div>
          ) : (
            subscriptions.map((sub) => {
              const unreadCount = getUnreadCount(sub.id);
              const isRefreshing = refreshingSubscriptionIds.has(sub.id);
              return (
                <ContextMenu key={sub.id}>
                  <ContextMenuTrigger>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => selectSubscription(sub.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectSubscription(sub.id); }}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-all duration-200 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring',
                        selectedSubscriptionId === sub.id
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      {sub.favicon ? (
                        <img src={sub.favicon} alt="" className="h-4 w-4 rounded-full" />
                      ) : (
                        <div className="h-4 w-4 rounded-full bg-gray-300" />
                      )}
                      <span className="truncate flex-1">{sub.title}</span>
                      {unreadCount > 0 && (
                        <Badge variant={selectedSubscriptionId === sub.id ? "default" : "secondary"} className="h-5 px-2 text-xs">
                          {unreadCount}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleRefresh(e, sub.id)}
                        disabled={isRefreshing}
                      >
                        <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
                        <span className="sr-only">Refresh</span>
                      </Button>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onSelect={() => onEditFeed(sub)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      <span>Edit Feed</span>
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                      onSelect={() => handleRemove(sub.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Remove Feed</span>
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })
          )}
        </nav>
      </ScrollArea>
    </div>
  );
}