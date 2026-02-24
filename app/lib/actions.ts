"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

const formSchema = z.object({
  id: z.string(),
  customer_id: z.string(),
  amount: z.coerce.number(),
  status: z.enum(["pending", "paid"]),
  date: z.string(),
});

const CreateInvoiceForm = formSchema.omit({
  id: true,
  date: true,
});
const UpdateInvoice = formSchema.omit({ id: true, date: true });
export async function createInvoice(formData: FormData) {
  console.log(formData);

  const { customer_id, amount, status } = CreateInvoiceForm.parse({
    customer_id: formData.get("customer_id") as string,
    amount: formData.get("amount"),
    status: formData.get("status") as string,
  });
  const amountInCents = Math.round(amount * 100);
  const date = new Date().toISOString().split("T")[0];
  try {
    await sql`
    INSERT INTO invoices (customer_id, amount, status, date)        
    VALUES (${customer_id}, ${amountInCents}, ${status}, ${date})
  `;
  } catch (error) {
    console.error("Database Error:", error);
    return {
      message: "添加失败",
    };
  }
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}
export async function updateInvoice(id: string, formData: FormData) {
  const { customer_id, amount, status } = UpdateInvoice.parse({
    customer_id: formData.get("customer_id"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  const amountInCents = amount * 100;
  try {
    await sql`
    UPDATE invoices
    SET customer_id = ${customer_id}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;
  } catch (error) {
    console.error("Database Error:", error);
    return {
      message: "修改失败",
    };
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath("/dashboard/invoices");
}
