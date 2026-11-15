"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ClientSession {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

function toClientSession(user: User | null): ClientSession | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const email = user.email ?? "";
  return {
    user: {
      id: user.id,
      email,
      name:
        (typeof meta.full_name === "string" && meta.full_name) ||
        (typeof meta.name === "string" && meta.name) ||
        email.split("@")[0],
      image: (typeof meta.avatar_url === "string" && meta.avatar_url) || null,
    },
  };
}

/** Client-side hook exposing the current Supabase session. */
export function useSession() {
  const [data, setData] = useState<ClientSession | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      setData(toClientSession(user));
      setIsPending(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setData(toClientSession(session?.user ?? null));
      setIsPending(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { data, isPending };
}

/** Signs the user out and sends them to the sign-in page. */
export async function signOut() {
  await createClient().auth.signOut();
  window.location.href = "/sign-in";
}

export const authClient = { useSession, signOut };
