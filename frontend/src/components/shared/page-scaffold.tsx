import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

type PageScaffoldProps = {
  title: string;
  description: string;
  actionLabel?: string;
  emptyTitle: string;
  emptyDescription: string;
};

export function PageScaffold({
  title,
  description,
  actionLabel,
  emptyTitle,
  emptyDescription,
}: PageScaffoldProps) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          actionLabel ? (
            <Button type="button" size="sm">
              {actionLabel}
            </Button>
          ) : null
        }
      />
      <EmptyState title={emptyTitle} description={emptyDescription} />
    </>
  );
}
