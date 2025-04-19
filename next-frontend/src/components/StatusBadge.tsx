import { Badge } from "@/components/ui/badge";

export type InvoiceStatus = "approved" | "pending" | "rejected";

interface StatusBadgeProps {
  status: InvoiceStatus;
}

const statusConfig = {
  approved: {
    text: "Aprovado",
    className: "bg-green-500/20 text-green-500 hover:bg-green-500/20",
  },
  pending: {
    text: "Pendente",
    className: "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20",
  },
  rejected: {
    text: "Rejeitado",
    className: "bg-red-500/20 text-red-500 hover:bg-red-500/20",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant="outline" className={config.className}>
      {config.text}
    </Badge>
  );
}
