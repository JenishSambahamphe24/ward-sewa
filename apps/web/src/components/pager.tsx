import { Button } from '@/components/ui/button.tsx';
import { LocaleHelper } from '@/lib/locale.helper.ts';
import { m } from '@/paraglide/messages.js';

interface PagerProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pager({ page, pageSize, total, onPageChange }: PagerProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages === 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
      <Button
        variant="outline"
        size="sm"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        {m.action_previous()}
      </Button>
      <span className="text-sm text-muted-foreground">
        {m.queue_page({
          page: LocaleHelper.digits(page),
          pages: LocaleHelper.digits(pages),
          total: LocaleHelper.digits(total),
        })}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
      >
        {m.action_next()}
      </Button>
    </div>
  );
}
