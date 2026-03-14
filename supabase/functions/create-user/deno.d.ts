// Type declarations for Deno runtime in Supabase Edge Functions

declare namespace Deno {
    export function serve(
        handler: (req: Request) => Response | Promise<Response>
    ): void;

    export namespace env {
        export function get(key: string): string | undefined;
    }
}

declare module "https://esm.sh/@supabase/supabase-js@2.39.3" {
    export * from "@supabase/supabase-js";
}
