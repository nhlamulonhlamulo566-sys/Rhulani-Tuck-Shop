import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

type SummaryCardProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  variant?: 'default' | 'destructive';
};

export default function SummaryCard({ title, value, icon: Icon, variant = 'default' }: SummaryCardProps) {
  return (
    <Card className={cn(variant === 'destructive' && 'bg-destructive/10 border-destructive text-destructive-foreground')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={cn(
          "text-sm font-medium",
           variant === 'destructive' ? 'text-destructive' : ''
        )}>{title}</CardTitle>
        <Icon className={cn("h-4 w-4 text-muted-foreground", variant === 'destructive' && 'text-destructive/80')} />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", variant === 'destructive' && 'text-destructive')}>{value}</div>
      </CardContent>
    </Card>
  );
}
