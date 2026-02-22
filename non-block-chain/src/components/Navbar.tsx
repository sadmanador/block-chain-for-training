"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export default function Navbar() {
    const { data: session } = useSession();

    if (!session) return null;

    return (
        <nav className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 shadow-lg">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link
                        href={session.user.role === "admin" ? "/admin" : "/dashboard"}
                        className="flex items-center space-x-2"
                    >
                        <span className="text-2xl">💸</span>
                        <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                            TransactApp
                        </span>
                    </Link>

                    <div className="flex items-center space-x-4">
                        <div className="hidden sm:flex items-center space-x-2 bg-slate-700/50 rounded-full px-4 py-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                            <span className="text-sm text-slate-300">{session.user.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-600 text-slate-300 uppercase tracking-wide">
                                {session.user.role}
                            </span>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="px-4 py-1.5 text-sm font-medium text-white bg-red-500/80 hover:bg-red-500 rounded-full transition-all duration-200 hover:shadow-lg hover:shadow-red-500/25"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
