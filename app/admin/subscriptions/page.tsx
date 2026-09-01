import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Subscriptions" };

const COLUMNS = ["Clinic", "Product", "Plan", "Status", "Renews"];

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Plans, billing status, and renewal cycles across all clients."
      />

      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((c) => (
              <TableHead key={c}>{c}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={COLUMNS.length} className="p-0">
              <EmptyState
                icon={CreditCard}
                title="Managed per product"
                description="Subscriptions are provisioned automatically by each product module — a client's AI Receptionist subscription is created on its first quota assignment under Products › AI Receptionist. A dedicated cross-product billing view is not part of this release."
              />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
