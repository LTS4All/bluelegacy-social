import { useMemo, useState } from "react";
import { Check, Feather, LockKeyhole, LogIn, LogOut, Send, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

const TOKEN_KEY = "bluelegacy.token";

type Mode = "register" | "login" | "feed" | "completed";

export default function Home() {
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem(TOKEN_KEY) ? "feed" : "register"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [body, setBody] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? "");
  const returnToApp = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("returnTo") === "bluelegacy";
  const returnToAppUrl = token ? `bluelegacy://auth?token=${encodeURIComponent(token)}` : "";
  const feedInput = useMemo(() => ({ limit: 50 }), []);
  const feed = trpc.blueLegacy.feed.useQuery(feedInput, { enabled: mode === "feed" });
  const register = trpc.blueLegacy.register.useMutation({
    onSuccess: result => {
      localStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
      setMode("completed");
      toast.success("Your BlueLegacy account is ready.");
    },
    onError: error => toast.error(error.message),
  });
  const login = trpc.blueLegacy.login.useMutation({
    onSuccess: result => {
      localStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
      setMode("feed");
      toast.success(`Welcome back, ${result.username}.`);
    },
    onError: error => toast.error(error.message),
  });
  const createPost = trpc.blueLegacy.createPost.useMutation({
    onSuccess: () => {
      setBody("");
      feed.refetch();
      toast.success("Posted to BlueLegacy.");
    },
    onError: error => toast.error(error.message),
  });
  const logout = trpc.blueLegacy.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem(TOKEN_KEY);
      setToken("");
      setMode("login");
    },
  });

  function submitRegistration(event: React.FormEvent) {
    event.preventDefault();
    register.mutate({ username, password, age: Number(age) });
  }

  function submitLogin(event: React.FormEvent) {
    event.preventDefault();
    login.mutate({ username, password });
  }

  if (mode === "feed") {
    return (
      <main className="min-h-screen bg-[#f5f7fb] text-[#172033]">
        <header className="border-b border-[#dce3ef] bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3"><BrandMark /><span className="text-lg font-semibold tracking-tight">BlueLegacy</span></div>
            <div className="flex items-center gap-2">{returnToApp && <Button variant="outline" size="sm" onClick={() => { window.location.href = returnToAppUrl; }}>Return to app</Button>}<Button variant="ghost" onClick={() => logout.mutate({ token })}><LogOut className="mr-2 size-4" /> Sign out</Button></div>
          </div>
        </header>
        <div className="mx-auto grid max-w-4xl gap-6 px-5 py-8 lg:grid-cols-[1fr_300px]">
          <section>
            <div className="mb-6 flex items-end justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5f6f86]">Shared feed</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">What’s happening in BlueLegacy</h1></div><Button variant="outline" onClick={() => feed.refetch()}>Refresh</Button></div>
            <div className="space-y-4">
              {feed.isLoading && <p className="rounded-2xl border border-dashed border-[#b8c5d8] p-8 text-center text-[#5f6f86]">Loading the shared feed…</p>}
              {feed.data?.length === 0 && <p className="rounded-2xl border border-dashed border-[#b8c5d8] p-8 text-center text-[#5f6f86]">No posts yet. Be the first to write something.</p>}
              {feed.data?.map(post => <article key={post.id} className="rounded-2xl border border-[#dce3ef] bg-white p-5 shadow-[0_8px_30px_rgba(49,71,104,0.06)]"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full bg-[#dceaff] text-[#1769ff]"><UserRound className="size-5" /></div><div><p className="font-semibold">{post.username}</p><p className="text-xs text-[#6e7e94]">{new Date(post.createdAt).toLocaleString()}</p></div></div><p className="mt-4 whitespace-pre-wrap leading-7 text-[#2c3a50]">{post.body}</p></article>)}
            </div>
          </section>
          <aside className="space-y-4">
            <Card className="border-[#dce3ef] shadow-[0_8px_30px_rgba(49,71,104,0.06)]"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Feather className="size-5 text-[#1769ff]" /> Create a post</CardTitle></CardHeader><CardContent><Textarea value={body} onChange={event => setBody(event.target.value)} maxLength={500} placeholder="Share something with BlueLegacy…" className="min-h-32 resize-none" /><div className="mt-3 flex items-center justify-between"><span className="text-xs text-[#6e7e94]">{body.length}/500</span><Button disabled={!body.trim() || createPost.isPending} onClick={() => createPost.mutate({ token, body })}><Send className="mr-2 size-4" /> Post</Button></div></CardContent></Card>
            <div className="rounded-2xl bg-[#172033] p-5 text-white"><ShieldCheck className="size-5 text-[#89b4ff]" /><p className="mt-3 text-sm leading-6 text-[#d6e1f4]">BlueLegacy keeps your account session protected and your shared posts available across the web and legacy app.</p></div>
          </aside>
        </div>
      </main>
    );
  }

  if (mode === "completed") {
    return <main className="grid min-h-screen place-items-center bg-[#172033] px-5"><Card className="w-full max-w-md border-0 shadow-2xl"><CardContent className="p-8 text-center"><div className="mx-auto grid size-16 place-items-center rounded-full bg-[#e5f7ed] text-[#16834b]"><Check className="size-8" /></div><p className="mt-6 text-sm font-semibold uppercase tracking-[0.22em] text-[#16834b]">Completed</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#172033]">Welcome to BlueLegacy</h1><p className="mt-3 leading-7 text-[#5f6f86]">Your account is ready. You can now return to Bluesky Legacy and switch to BlueLegacy mode.</p><Button className="mt-7 w-full" onClick={() => setMode("feed")}>Open BlueLegacy</Button>{returnToApp && <Button variant="outline" className="mt-3 w-full" onClick={() => { window.location.href = returnToAppUrl; }}>Return to Bluesky Legacy</Button>}</CardContent></Card></main>;
  }

  const isRegister = mode === "register";
  return <main className="min-h-screen bg-[#172033] px-5 py-10 text-white"><div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1.05fr_420px]"><section className="hidden lg:block"><BrandMark large /><p className="mt-8 text-sm font-semibold uppercase tracking-[0.22em] text-[#8fb8ff]">A small shared social space</p><h1 className="mt-4 max-w-xl text-6xl font-semibold leading-[1.02] tracking-[-0.04em]">Write once. Find it everywhere.</h1><p className="mt-6 max-w-lg text-lg leading-8 text-[#bfcee4]">BlueLegacy connects the account website with the BlueLegacy mode inside Bluesky Legacy, so your feed and posts follow you between web and iOS.</p></section><Card className="border-0 shadow-2xl"><CardHeader><div className="flex items-center gap-3"><BrandMark /><div><CardTitle className="text-2xl text-[#172033]">{isRegister ? "Create your account" : "Welcome back"}</CardTitle><p className="mt-1 text-sm text-[#6e7e94]">{isRegister ? "Three fields. One clear start." : "Sign in to continue to BlueLegacy."}</p></div></div></CardHeader><CardContent><form onSubmit={isRegister ? submitRegistration : submitLogin} className="space-y-4"><Input value={username} onChange={event => setUsername(event.target.value)} placeholder="Username" autoComplete="username" required minLength={3} maxLength={32} /><Input value={password} onChange={event => setPassword(event.target.value)} placeholder="Password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} required minLength={8} maxLength={128} />{isRegister && <Input value={age} onChange={event => setAge(event.target.value)} placeholder="Age" type="number" min={13} max={120} required />}{isRegister && <p className="text-xs leading-5 text-[#6e7e94]">You must be at least 13 years old to create a BlueLegacy account.</p>}<Button className="w-full" disabled={register.isPending || login.isPending}>{isRegister ? "Create BlueLegacy account" : <><LogIn className="mr-2 size-4" /> Login with BlueLegacy</>}</Button></form><button className="mt-5 w-full text-sm font-medium text-[#1769ff]" onClick={() => setMode(isRegister ? "login" : "register")}>{isRegister ? "Already have an account? Sign in" : "Need an account? Create one"}</button>{!isRegister && <div className="mt-5 flex items-center gap-2 text-xs text-[#6e7e94]"><LockKeyhole className="size-4" /> Sessions expire automatically for safety.</div>}</CardContent></Card></div></main>;
}

function BrandMark({ large = false }: { large?: boolean }) {
  return <div className={`${large ? "size-16" : "size-10"} grid place-items-center rounded-2xl bg-[#1769ff] text-white shadow-[0_8px_20px_rgba(23,105,255,0.28)]`}><span className={`${large ? "text-3xl" : "text-xl"} font-bold`}>B</span></div>;
}
