import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { StatusBadge } from '@/components/status-badge.tsx';
import type { ApplicationStatus } from '@/components/status-badge.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { Carousel } from '@/components/ui/carousel.tsx';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx';
import { Ribbon } from '@/components/ui/ribbon.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/design')({ component: StyleGuide });

const STATUSES: ApplicationStatus[] = [
  'draft',
  'submitted',
  'under_review',
  'needs_info',
  'approved',
  'rejected',
  'issued',
];

const SERVICES = [
  { title: m.sample_residence, fee: '१००', stripe: 'primary' },
  { title: m.sample_relationship, fee: '२००', stripe: 'accent' },
  { title: m.sample_birth_date, fee: '१००', stripe: 'highlight' },
  { title: m.sample_unmarried, fee: '१००', stripe: 'primary' },
] as const;

interface SectionProps {
  title: string;
  children: ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function StyleGuide() {
  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{m.design_heading()}</h1>
        <p className="text-muted-foreground">{m.design_intro()}</p>
        <div className="flex gap-2">
          <span className="h-3 w-16 rounded-full bg-primary" />
          <span className="h-3 w-16 rounded-full bg-accent" />
          <span className="h-3 w-16 rounded-full bg-highlight" />
        </div>
      </header>

      <Section title={m.design_buttons()}>
        <div className="flex flex-wrap gap-3">
          <Button>{m.action_apply()}</Button>
          <Button variant="accent">{m.action_confirm()}</Button>
          <Button variant="highlight">{m.status_under_review()}</Button>
          <Button variant="outline">{m.action_cancel()}</Button>
          <Button variant="ghost">{m.action_close()}</Button>
          <Button variant="link">{m.nav_style_guide()}</Button>
        </div>
      </Section>

      <Section title={m.design_pills()}>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="primary">{m.ribbon_popular()}</Badge>
          <Badge tone="accent">{m.ribbon_new()}</Badge>
          <Badge tone="highlight">{m.sample_fee({ amount: '१००' })}</Badge>
        </div>
      </Section>

      <Section title={m.design_cards()}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card stripe="primary">
            <Ribbon tone="highlight">{m.ribbon_popular()}</Ribbon>
            <CardHeader>
              <CardTitle>{m.sample_residence()}</CardTitle>
              <CardDescription>{m.sample_fee({ amount: '१००' })}</CardDescription>
            </CardHeader>
            <CardContent>
              <StatusBadge status="under_review" />
            </CardContent>
          </Card>
          <Card stripe="accent">
            <Ribbon tone="accent">{m.ribbon_new()}</Ribbon>
            <CardHeader>
              <CardTitle>{m.sample_relationship()}</CardTitle>
              <CardDescription>{m.sample_fee({ amount: '२००' })}</CardDescription>
            </CardHeader>
            <CardContent>
              <StatusBadge status="approved" />
            </CardContent>
          </Card>
          <Card stripe="highlight">
            <CardHeader>
              <CardTitle>{m.sample_unmarried()}</CardTitle>
              <CardDescription>{m.sample_fee({ amount: '१००' })}</CardDescription>
            </CardHeader>
            <CardContent>
              <StatusBadge status="rejected" />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title={m.design_carousel()}>
        <Carousel
          label={m.sample_carousel_label()}
          previousLabel={m.action_previous()}
          nextLabel={m.action_next()}
        >
          {SERVICES.map((service) => (
            <Card key={service.title()} stripe={service.stripe} className="h-full">
              <CardHeader>
                <CardTitle>{service.title()}</CardTitle>
                <CardDescription>{m.sample_fee({ amount: service.fee })}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="sm">{m.action_apply()}</Button>
              </CardContent>
            </Card>
          ))}
        </Carousel>
      </Section>

      <div className="grid gap-10 sm:grid-cols-2">
        <Section title={m.design_modal()}>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="self-start">
                {m.action_open_modal()}
              </Button>
            </DialogTrigger>
            <DialogContent closeLabel={m.action_close()}>
              <DialogTitle>{m.design_modal_title()}</DialogTitle>
              <DialogDescription>{m.design_modal_body()}</DialogDescription>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline">{m.action_cancel()}</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="accent">{m.action_confirm()}</Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        </Section>

        <Section title={m.design_switch()}>
          <label className="flex items-center gap-3 text-sm">
            <Switch defaultChecked />
            {m.design_switch_label()}
          </label>
        </Section>
      </div>

      <Section title={m.design_tabs()}>
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">{m.tab_pending()}</TabsTrigger>
            <TabsTrigger value="approved">{m.tab_approved()}</TabsTrigger>
            <TabsTrigger value="rejected">{m.tab_rejected()}</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">{m.tab_pending_body()}</TabsContent>
          <TabsContent value="approved">{m.tab_approved_body()}</TabsContent>
          <TabsContent value="rejected">{m.tab_rejected_body()}</TabsContent>
        </Tabs>
      </Section>
    </div>
  );
}
