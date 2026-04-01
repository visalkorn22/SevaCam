import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function SignupSuccessPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-(--bg-base) p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-(--state-success-subtle)">
                <CheckCircle2 className="h-8 w-8 text-(--state-success)" />
              </div>
              <CardTitle className="text-2xl">Check Your Email</CardTitle>
              <CardDescription>
                We&apos;ve sent you a confirmation link
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-sm text-(--text-secondary)">
                Thank you for signing up! Please check your email inbox and
                click the confirmation link to activate your account.
              </p>
              <p className="text-center text-sm text-(--text-secondary)">
                Once confirmed, you&apos;ll be able to sign in and start booking
                appointments.
              </p>
              <div className="pt-4">
                <Button asChild className="w-full">
                  <Link href="/auth/login">Back to Login</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
