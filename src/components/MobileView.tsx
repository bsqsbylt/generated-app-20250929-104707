import React from 'react';
import { useFeedStore } from '@/store/feedStore';
import { SubscriptionPanel } from '@/components/SubscriptionPanel';
import { ArticleListPanel } from '@/components/ArticleListPanel';
import { ArticleContentPanel } from '@/components/ArticleContentPanel';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { Subscription } from '@shared/types';
interface MobileViewProps {
  onAddFeed: () => void;
  onEditFeed: (subscription: Subscription) => void;
}
export function MobileView({ onAddFeed, onEditFeed }: MobileViewProps) {
  const selectedSubscriptionId = useFeedStore((state) => state.selectedSubscriptionId);
  const selectedArticleId = useFeedStore((state) => state.selectedArticleId);
  const selectSubscription = useFeedStore((state) => state.selectSubscription);
  const selectArticle = useFeedStore((state) => state.selectArticle);
  const handleBackToFeeds = () => {
    selectSubscription(null);
  };
  const handleBackToArticles = () => {
    selectArticle(null);
  };
  if (selectedSubscriptionId) {
    if (selectedArticleId) {
      return (
        <div className="h-full flex flex-col">
          <div className="p-2 border-b">
            <Button variant="ghost" size="sm" onClick={handleBackToArticles}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Articles
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ArticleContentPanel />
          </div>
        </div>
      );
    }
    return (
      <div className="h-full flex flex-col">
        <div className="p-2 border-b">
          <Button variant="ghost" size="sm" onClick={handleBackToFeeds}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            All Feeds
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ArticleListPanel />
        </div>
      </div>
    );
  }
  return (
    <div className="h-full">
      <SubscriptionPanel onAddFeed={onAddFeed} onEditFeed={onEditFeed} />
    </div>
  );
}