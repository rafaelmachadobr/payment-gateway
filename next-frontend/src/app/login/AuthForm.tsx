import { InfoIcon } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

export async function loginAction(formData: FormData) {
  "use server";
  const apiKey = formData.get("apiKey");

  const response = await fetch("http://localhost:8080/accounts", {
    headers: {
      "X-API-KEY": apiKey as string,
    },
  });

  if (!response.ok) {
    throw new Error("Invalid API Key");
  }

  const cookiesStore = await cookies();
  cookiesStore.set("apiKey", apiKey as string);

  redirect("/invoices");
}

export function AuthForm() {
  return (
    <form className="space-y-4" action={loginAction}>
      <div className="space-y-2">
        <label htmlFor="apiKey" className="text-sm text-gray-300">
          API Key
        </label>
        <div className="flex gap-2">
          <Input
            id="apiKey"
            placeholder="Digite sua API Key"
            className="bg-[#2a3749] border-gray-700 text-white placeholder-gray-400"
            name="apiKey"
          />
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            →
          </Button>
        </div>
      </div>

      <Alert className="bg-[#2a3749] border-gray-700 mt-4">
        <InfoIcon className="h-4 w-4 text-blue-400" />
        <AlertTitle className="text-gray-200">
          Como obter uma API Key?
        </AlertTitle>
        <AlertDescription className="text-gray-400">
          Para obter sua API Key, você precisa criar uma conta de comerciante.
          Entre em contato com nosso suporte para mais informações.
        </AlertDescription>
      </Alert>
    </form>
  );
}
