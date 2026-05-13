"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button, Card, Field, Input } from "@/components/ui";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (searchParams.get("error")) {
      setError("驗證連結失效，請重新發送。");
    }
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, [router, searchParams, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError("未設定 Supabase 環境變數，無法使用登入功能。");
      return;
    }
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  }

  if (!supabase) {
    return (
      <Card className="max-w-sm mx-auto space-y-3 text-center">
        <h1 className="text-xl font-bold">登入</h1>
        <p className="text-sm text-gray-500">
          尚未設定 Supabase，目前使用本機儲存模式。
        </p>
        <Button onClick={() => router.push("/dashboard")}>前往總覽</Button>
      </Card>
    );
  }

  if (sent) {
    return (
      <Card className="max-w-sm mx-auto space-y-3 text-center">
        <h1 className="text-xl font-bold">已寄出驗證信</h1>
        <p className="text-sm text-gray-500">
          請至 <strong>{email}</strong> 的信箱點擊連結完成登入。
        </p>
        <p className="text-xs text-gray-400">若未收到，請檢查垃圾郵件資料夾。</p>
      </Card>
    );
  }

  return (
    <div className="max-w-sm mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">登入 EatPlan</h1>
        <p className="text-sm text-gray-500">
          輸入 Email，我們會寄送一次性登入連結。
        </p>
      </div>
      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="電子郵件">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </Field>
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "送出中…" : "寄送登入連結"}
          </Button>
        </form>
      </Card>
      <p className="text-center text-xs text-gray-500">
        不需要密碼，點擊信中連結即可登入。
      </p>
    </div>
  );
}
