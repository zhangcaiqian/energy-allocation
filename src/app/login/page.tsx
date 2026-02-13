"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSeedling, faSpinner } from "@fortawesome/free-solid-svg-icons";

export default function LoginPage() {
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
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("邮箱或密码不正确");
        setLoading(false);
      } else {
        setRedirecting(true);
        router.push("/");
        router.refresh();
        // Keep loading state until page navigates
        return;
      }
    } catch {
      setError("登录失败，请稍后重试");
      setLoading(false);
    }
  };

  if (redirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <FontAwesomeIcon icon={faSeedling} className="text-4xl text-[#6b9b7a] mb-4 animate-pulse" />
        <p className="text-sm text-[#7a7a7a]">
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
        <FontAwesomeIcon icon={faSeedling} className="text-5xl text-[#6b9b7a] mb-3" />
        <h1 className="text-2xl font-bold text-[#2d2d2d]">留白</h1>
        <p className="text-sm text-[#7a7a7a] mt-1">你的精力觉察伙伴</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <p className="text-sm text-[#d9534f] text-center">{error}</p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "登录中..." : "登录"}
        </Button>
      </form>

      <p className="text-center text-sm text-[#7a7a7a] mt-6">
        还没有账号？{" "}
        <Link href="/register" className="text-[#6b9b7a] font-medium hover:underline">
          注册
        </Link>
      </p>
    </div>
  );
}
