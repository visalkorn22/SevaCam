import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertCircle } from "lucide-react"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string }>
}) {
  const params = await searchParams
  const errorCode = params.error || "unknown_error"
  const errorDescription = params.error_description || "An unexpected error occurred"

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-(--bg-base) p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-(--state-error-subtle)">
              <AlertCircle className="h-8 w-8 text-(--state-error)" />
            </div>
            <CardTitle className="text-2xl">Authentication Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-(--radius-md) bg-(--state-error-subtle) p-4">
              <p className="text-sm font-medium text-(--state-error)">Error Code: {errorCode}</p>
              <p className="mt-2 text-sm text-(--state-error) opacity-80">{errorDescription}</p>
            </div>
            <div className="pt-4">
              <Button asChild className="w-full">
                <Link href="/auth/login">Back to Login</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
