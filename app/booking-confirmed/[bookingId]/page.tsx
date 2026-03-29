import { redirect } from "next/navigation";

export default async function BookingConfirmedPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  redirect(`/payment/${bookingId}`);
}
