import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "@/components/StatusBadge";
import { Download, Eye, PlusIcon } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

export async function getInvoices() {
  const cookiesStore = await cookies();
  const apiKey = cookiesStore.get("apiKey")?.value;
  const response = await fetch("http://localhost:8080/invoice", {
    headers: {
      "X-API-KEY": apiKey as string,
    },
    cache: "force-cache",
    next: {
      tags: [`accounts/${apiKey}/invoices`],
    },
  });
  return response.json();
}

export async function InvoiceList() {
  const invoices = await getInvoices();

  return (
    <div className="bg-[#1e293b] rounded-lg p-6 border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Faturas</h1>
          <p className="text-gray-400">
            Gerencie suas faturas e acompanhe os pagamentos
          </p>
        </div>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
          asChild
        >
          <Link href="/invoices/create">
            <PlusIcon className="h-4 w-4 mr-2" />
            Nova Fatura
          </Link>
        </Button>
      </div>

      {/* Filtros */}
      {/* <div className="bg-[#232f43] rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-[#2a3749] border-gray-700 text-white">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="rejected">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1 block">Data Inicial</label>
          <Input
            type="text"
            placeholder="dd/mm/aaaa"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-[#2a3749] border-gray-700 text-white placeholder-gray-400"
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1 block">Data Final</label>
          <Input
            type="text"
            placeholder="dd/mm/aaaa"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-[#2a3749] border-gray-700 text-white placeholder-gray-400"
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1 block">Buscar</label>
          <Input
            type="text"
            placeholder="ID ou descrição"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#2a3749] border-gray-700 text-white placeholder-gray-400"
          />
        </div>
      </div> */}

      {/* Tabela de Faturas */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">
                ID
              </th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">
                DATA
              </th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">
                DESCRIÇÃO
              </th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">
                VALOR
              </th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">
                STATUS
              </th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">
                AÇÕES
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-b border-gray-800">
                <td className="py-4 px-4 text-white">{invoice.id}</td>
                <td className="py-4 px-4 text-white">
                  {new Date(invoice.created_at).toLocaleDateString()}
                </td>
                <td className="py-4 px-4 text-white">{invoice.description}</td>
                <td className="py-4 px-4 text-white">
                  R$ {invoice.amount.toFixed(2).replace(".", ",")}
                </td>
                <td className="py-4 px-4">
                  <StatusBadge status={invoice.status} />
                </td>
                <td className="py-4 px-4">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-gray-700"
                      asChild
                    >
                      <Link href={`/invoices/${invoice.id}`}>
                        <Eye className="h-4 w-4 text-gray-400" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-gray-700"
                    >
                      <Download className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-400">
          Mostrando 1 - 3 de 50 resultados
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 bg-[#2a3749] border-gray-700"
          >
            &lt;
          </Button>
          <Button size="sm" className="h-8 w-8 bg-indigo-600 text-white">
            1
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 bg-[#2a3749] border-gray-700"
          >
            2
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 bg-[#2a3749] border-gray-700"
          >
            3
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 bg-[#2a3749] border-gray-700"
          >
            &gt;
          </Button>
        </div>
      </div>
    </div>
  );
}
