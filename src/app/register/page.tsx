"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLeaf, faSpinner } from "@fortawesome/free-solid-svg-icons";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "注册失败");
        setLoading(false);
        return;
      }

      // Auto login after registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/login");
      } else {
        setRedirecting(true);
        router.push("/");
        router.refresh();
        // Don't setLoading(false) — keep loading state until page navigates
        return;
      }
    } catch {
      setError("注册失败，请稍后重试");
    }
    setLoading(false);
  };

  if (redirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <FontAwesomeIcon icon={faLeaf} className="text-4xl text-[#6b9b7a] mb-4 animate-pulse" />
        <p className="text-[#2d2d2d] font-medium">注册成功</p>
        <p className="text-sm text-[#7a7a7a] mt-1">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-1.5" />
          正在进入花园...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6">
      {/* Logo area */}
      <div className="text-center mb-10">
        <FontAwesomeIcon icon={faLeaf} className="text-5xl text-[#6b9b7a] mb-3" />
        <h1 className="text-2xl font-bold text-[#2d2d2d]">加入留白</h1>
        <p className="text-sm text-[#7a7a7a] mt-1">开始觉察你的精力</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            type="text"
            placeholder="你的名字"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <Input
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <Input
            type="password"
            placeholder="密码（至少 6 位）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>

        {error && (
          <p className="text-sm text-[#d9534f] text-center">{error}</p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "注册中..." : "开始留白之旅"}
        </Button>
      </form>

      <p className="text-center text-sm text-[#7a7a7a] mt-6">
        已有账号？{" "}
        <Link href="/login" className="text-[#6b9b7a] font-medium hover:underline">
          登录
        </Link>
      </p>
    </div>
  );
}
