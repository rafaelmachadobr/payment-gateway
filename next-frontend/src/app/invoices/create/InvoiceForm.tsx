"use client";

import { CreditCard } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { createInvoiceAction } from "./create-invoice-action";

export function InvoiceForm() {
  return (
    <form action={createInvoiceAction}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Informações da Fatura */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="amount" className="text-gray-300 block">
              Valor (R$)
            </label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step={0.01}
              min={0}
              defaultValue={0.01}
              placeholder="0,00"
              className="bg-[#2a3749] border-gray-700 text-white placeholder-gray-400"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-gray-300 block">
              Descrição
            </label>
            <Textarea
              id="description"
              name="description"
              placeholder="Descreva o motivo do pagamento"
              defaultValue={"Pagamento de fatura"}
              className="bg-[#2a3749] border-gray-700 min-h-[120px] text-white placeholder-gray-400"
            />
          </div>
        </div>

        {/* Dados do Cartão */}
        <div className="bg-[#232f43] rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Dados do Cartão
          </h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="cardNumber" className="text-gray-300 block">
                Número do Cartão
              </label>
              <div className="relative">
                <Input
                  id="cardNumber"
                  name="cardNumber"
                  placeholder="0000000000000000"
                  defaultValue={"1111111111111111"}
                  maxLength={16}
                  className="bg-[#2a3749] border-gray-700 pl-10 text-white placeholder-gray-400"
                />
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="expiryDate" className="text-gray-300 block">
                  Data de Expiração
                </label>
                <Input
                  id="expiryDate"
                  name="expiryDate"
                  placeholder="MM/AA"
                  defaultValue={"12/25"}
                  className="bg-[#2a3749] border-gray-700 text-white placeholder-gray-400"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="cvv" className="text-gray-300 block">
                  CVV
                </label>
                <Input
                  id="cvv"
                  name="cvv"
                  placeholder="123"
                  defaultValue={"123"}
                  className="bg-[#2a3749] border-gray-700 text-white placeholder-gray-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="cardholderName" className="text-gray-300 block">
                Nome no Cartão
              </label>
              <Input
                id="cardholderName"
                name="cardholderName"
                placeholder="Como aparece no cartão"
                defaultValue={"Nome Sobrenome"}
                className="bg-[#2a3749] border-gray-700 text-white placeholder-gray-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Resumo de Valores */}
      {/* <div className="mt-8 border-t border-gray-800 pt-4">
        <div className="flex justify-between py-2">
          <span className="text-gray-300">Subtotal</span>
          <span className="text-white">
            R$ {value.toFixed(2).replace(".", ",")}
          </span>
        </div>

        <div className="flex justify-between py-2 border-b border-gray-800">
          <span className="text-gray-300">Taxa de Processamento (2%)</span>
          <span className="text-white">
            R$ {processingFee.toFixed(2).replace(".", ",")}
          </span>
        </div>

        <div className="flex justify-between py-4">
          <span className="text-xl font-semibold text-white">Total</span>
          <span className="text-xl font-semibold text-white">
            R$ {total.toFixed(2).replace(".", ",")}
          </span>
        </div>
      </div> */}

      {/* Botões de Ação */}
      <div className="mt-6 flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          className="bg-[#2a3749] border-gray-700"
        >
          Cancelar
        </Button>

        <Button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Processar Pagamento
        </Button>
      </div>
    </form>
  );
}
