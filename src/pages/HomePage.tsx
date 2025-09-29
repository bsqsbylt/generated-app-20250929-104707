import { useState, useEffect } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { SubscriptionPanel } from '@/components/SubscriptionPanel';
import { ArticleListPanel } from '@/components/ArticleListPanel';
import { ArticleContentPanel } from '@/components/ArticleContentPanel';
import { AddFeedDialog } from '@/components/AddFeedDialog';
import { EditFeedDialog } from '@/components/EditFeedDialog';
import { Toaster } from '@/components/ui/sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Waves } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileView } from '@/components/MobileView';
import { useFeedStore } from '@/store/feedStore';
import type { Subscription } from '@shared/types';
export function HomePage() {
  const [isAddFeedOpen, setAddFeedOpen] = useState(false);
  const [isEditFeedOpen, setEditFeedOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const isMobile = useIsMobile();
  const fetchSubscriptions = useFeedStore((state) => state.fetchSubscriptions);
  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);
  const handleEditFeed = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setEditFeedOpen(true);
  };
  const DesktopView = () => (
    <ResizablePanelGroup direction="horizontal" className="h-full w-full">
      <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
        <SubscriptionPanel
          onAddFeed={() => setAddFeedOpen(true)}
          onEditFeed={handleEditFeed}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={30} minSize={25} maxSize={45}>
        <ArticleListPanel />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50} minSize={30}>
        <ArticleContentPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col">
      <header className="flex items-center h-14 px-4 md:px-6 border-b shrink-0">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Waves className="h-6 w-6 text-blue-500" />
          <span>RSS阅读器</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle className="relative top-0 right-0" />
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        {isMobile ? (
          <MobileView
            onAddFeed={() => setAddFeedOpen(true)}
            onEditFeed={handleEditFeed}
          />
        ) : (
          <DesktopView />
        )}
      </main>
      <AddFeedDialog open={isAddFeedOpen} onOpenChange={setAddFeedOpen} />
      <EditFeedDialog
        subscription={editingSubscription}
        open={isEditFeedOpen}
        onOpenChange={setEditFeedOpen}
      />
      <Toaster richColors position="top-right" />
    </div>
  );
}