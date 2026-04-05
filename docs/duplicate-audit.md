# HowlBoard Duplicate Code Audit

**Date:** 2026-04-04
**Scope:** All source files in `packages/` and `apps/web/src/`

---

## 1. Ownership Check Pattern (API Routers)

**Priority: HIGH -- 10+ occurrences**

The same "fetch entity by ID, check ownerId matches session user" pattern is repeated across nearly every mutation in `boards.ts` and `collections.ts`.

### Pattern

```ts
const [existing] = await db
  .select()
  .from(TABLE)
  .where(eq(TABLE.id, input.id))
  .limit(1);

if (!existing || existing.ownerId !== ctx.session.user.id) {
  return null; // or { success: false }
}
```

### Occurrences

| File | Lines | Procedure |
|------|-------|-----------|
| `packages/api/src/routers/boards.ts` | 34-43 | `getById` |
| `packages/api/src/routers/boards.ts` | 89-97 | `update` |
| `packages/api/src/routers/boards.ts` | 111-118 | `delete` |
| `packages/api/src/routers/boards.ts` | 133-140 | `restore` |
| `packages/api/src/routers/boards.ts` | 154-161 | `permanentlyDelete` |
| `packages/api/src/routers/boards.ts` | 182-189 | `saveDrawing` |
| `packages/api/src/routers/boards.ts` | 210-217 | `saveThumbnail` |
| `packages/api/src/routers/boards.ts` | 261-268 | `loadDrawing` |
| `packages/api/src/routers/boards.ts` | 283-289 | `createShareLink` |
| `packages/api/src/routers/collections.ts` | 58-65 | `update` |
| `packages/api/src/routers/collections.ts` | 80-87 | `delete` |
| `packages/api/src/routers/collections.ts` | 110-117 | `assignBoard` (board ownership) |
| `packages/api/src/routers/collections.ts` | 122-133 | `assignBoard` (collection ownership) |

### Recommendation

Extract a reusable tRPC middleware or helper function:

```ts
// packages/api/src/helpers/ownership.ts
export async function requireBoardOwnership(
  boardId: string,
  userId: string,
): Promise<typeof board.$inferSelect> {
  const [existing] = await db
    .select()
    .from(board)
    .where(eq(board.id, boardId))
    .limit(1);

  if (!existing || existing.ownerId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  return existing;
}
```

Or create a tRPC middleware that injects the owned board into the context:

```ts
const ownedBoardProcedure = protectedProcedure
  .input(z.object({ id: z.string() }))
  .use(async ({ ctx, input, next }) => {
    const board = await requireBoardOwnership(input.id, ctx.session.user.id);
    return next({ ctx: { ...ctx, board } });
  });
```

This would eliminate ~13 duplicated blocks and centralize authorization logic.

---

## 2. R2 Binary-to-Base64 Conversion

**Priority: MEDIUM -- 3 occurrences**

The identical pattern of reading an R2 object and converting it to a base64 data URI appears in multiple places.

### Pattern

```ts
const arrayBuffer = await object.arrayBuffer();
const bytes = new Uint8Array(arrayBuffer);
let binary = "";
for (let i = 0; i < bytes.length; i += 8192) {
  binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
}
return `data:image/png;base64,${btoa(binary)}`;
```

### Occurrences

| File | Lines | Procedure |
|------|-------|-----------|
| `packages/api/src/routers/boards.ts` | 249-255 | `getThumbnail` |
| `packages/api/src/routers/settings.ts` | 214-220 | `getAvatar` |

And the inverse (base64 decode to Uint8Array for upload):

```ts
const buffer = Uint8Array.from(atob(input.data), (c) => c.charCodeAt(0));
```

| File | Lines | Procedure |
|------|-------|-----------|
| `packages/api/src/routers/boards.ts` | 221 | `saveThumbnail` |
| `packages/api/src/routers/settings.ts` | 190 | `uploadAvatar` |

### Recommendation

Extract to a shared utility in `packages/api/src/helpers/r2.ts`:

```ts
export async function r2ObjectToDataUri(
  object: R2ObjectBody,
  mimeType = "image/png",
): Promise<string> { ... }

export function base64ToBuffer(base64: string): Uint8Array { ... }
```

---

## 3. Excalidraw Dynamic Import Pattern

**Priority: MEDIUM -- 2 occurrences**

Both `editor.tsx` and `shared-board.tsx` use the same lazy-loading pattern for Excalidraw.

### Pattern

```ts
let ExcalidrawComponent: any = null;

useEffect(() => {
  import("@excalidraw/excalidraw").then((mod) => {
    ExcalidrawComponent = mod.Excalidraw;
    setExcalidrawLoaded(true);
  });
}, []);
```

### Occurrences

| File | Lines |
|------|-------|
| `apps/web/src/pages/editor.tsx` | 16-20, 96-103 |
| `apps/web/src/pages/shared-board.tsx` | 12, 28-33 |

### Recommendation

Extract a custom hook:

```ts
// apps/web/src/hooks/use-excalidraw.ts
export function useExcalidraw() {
  const [loaded, setLoaded] = useState(false);
  const componentsRef = useRef<{ Excalidraw: any; MainMenu?: any; exportToBlob?: any } | null>(null);

  useEffect(() => {
    import("@excalidraw/excalidraw").then((mod) => {
      componentsRef.current = { Excalidraw: mod.Excalidraw, MainMenu: mod.MainMenu, exportToBlob: mod.exportToBlob };
      setLoaded(true);
    });
  }, []);

  return { loaded, components: componentsRef.current };
}
```

---

## 4. `(user as Record<string, unknown>)?.role` Type Assertion

**Priority: HIGH -- 3 occurrences**

The same unsafe type assertion is used to access the `role` and `username` fields on the Better Auth user object, which does not include custom fields in its TypeScript types.

### Pattern

```ts
(user as Record<string, unknown>)?.role as string
(user as Record<string, unknown>)?.username as string
```

### Occurrences

| File | Lines | Field |
|------|-------|-------|
| `apps/web/src/pages/settings/profile.tsx` | 52-53 | `username` |
| `apps/web/src/pages/settings/profile.tsx` | 241 | `role` |
| `apps/web/src/pages/settings/members.tsx` | 47 | `role` |
| `apps/web/src/components/sidebar.tsx` | 76-77 | `username` |

### Recommendation

Create a typed helper or augment the Better Auth session type in a single place:

```ts
// apps/web/src/lib/auth-helpers.ts
import type { Session } from "better-auth/react";

type HowlBoardUser = Session["user"] & {
  role: "owner" | "member";
  username: string | null;
};

export function getUser(session: Session | null): HowlBoardUser | null {
  if (!session?.user) return null;
  return session.user as HowlBoardUser;
}

export function getUserRole(session: Session | null): string {
  return (session?.user as HowlBoardUser)?.role ?? "member";
}

export function getUsername(session: Session | null): string {
  const user = session?.user as HowlBoardUser;
  return user?.username ?? user?.email?.split("@")[0] ?? "user";
}
```

This also eliminates the duplicated fallback logic for username (`?? user?.email?.split("@")[0] ?? "user"`) which appears in `sidebar.tsx:76-78` and `profile.tsx:52-53`.

---

## 5. Legal Page Components (Terms / Privacy)

**Priority: HIGH -- 2 files, near-identical**

`terms.tsx` and `privacy.tsx` are structurally identical -- they differ only in the `page` parameter passed to `getLegalPage`.

### Files

| File | Lines |
|------|-------|
| `apps/web/src/pages/legal/terms.tsx` | 1-37 |
| `apps/web/src/pages/legal/privacy.tsx` | 1-37 |

### Recommendation

Extract a single `LegalPage` component:

```tsx
// apps/web/src/pages/legal/legal-page.tsx
export function LegalPage({ page }: { page: "tos" | "privacy" }) {
  const trpc = useTRPC();
  const { data, isPending } = useQuery(
    trpc.settings.getLegalPage.queryOptions({ page }),
  );
  // ... shared layout
}
```

Then in `app.tsx`:
```tsx
<Route path="/legal/terms" element={<LegalPage page="tos" />} />
<Route path="/legal/privacy" element={<LegalPage page="privacy" />} />
```

---

## 6. Confirmation Dialog Pattern

**Priority: MEDIUM -- 3 occurrences**

The same destructive-action confirmation dialog structure (Dialog > DialogHeader > DialogTitle > DialogDescription > DialogFooter with Cancel + destructive action) is repeated.

### Pattern

```tsx
<Dialog open={!!target} onOpenChange={() => setTarget(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>...</DialogTitle>
      <DialogDescription>Are you sure? ...</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
      <Button variant="destructive" disabled={mutation.isPending} onClick={...}>
        {mutation.isPending ? "Deleting..." : "Delete"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Occurrences

| File | Lines | Purpose |
|------|-------|---------|
| `apps/web/src/pages/dashboard.tsx` | 196-220 | Delete board |
| `apps/web/src/pages/trash.tsx` | 92-112 | Permanently delete board |
| `apps/web/src/pages/settings/profile.tsx` | 303-319 | Delete account |

### Recommendation

Extract a reusable `ConfirmDialog` component:

```tsx
// apps/web/src/components/confirm-dialog.tsx
interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  pendingLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
  variant?: "destructive" | "default";
}

export function ConfirmDialog({ ... }: ConfirmDialogProps) { ... }
```

---

## 7. Page Header Pattern

**Priority: LOW -- 7 occurrences**

Most dashboard pages start with an identical header bar structure.

### Pattern

```tsx
<div className="border-b border-border px-6 py-4">
  <h1 className="text-lg font-semibold text-foreground">Page Title</h1>
</div>
```

Some have a second line or action buttons:

```tsx
<div className="flex items-center justify-between border-b border-border px-6 py-4">
  <h1 className="text-lg font-semibold text-foreground">Page Title</h1>
  <Button>Action</Button>
</div>
```

### Occurrences

| File | Lines |
|------|-------|
| `apps/web/src/pages/dashboard.tsx` | 99-117 |
| `apps/web/src/pages/trash.tsx` | 44-49 |
| `apps/web/src/pages/settings/index.tsx` | 26-28 |
| `apps/web/src/pages/settings/profile.tsx` | 132-134 |
| `apps/web/src/pages/settings/collections.tsx` | 8-13 |
| `apps/web/src/pages/settings/members.tsx` | 21-25 |
| `apps/web/src/pages/settings/legal.tsx` | 76-78 |

### Recommendation

Extract a `PageHeader` component:

```tsx
export function PageHeader({ title, description, action }: {
  title: string;
  description?: string;
  action?: ReactNode;
}) { ... }
```

---

## 8. Loading State Pattern

**Priority: LOW -- 4 occurrences**

Multiple pages use the same centered loading spinner pattern.

### Pattern

```tsx
<div className="flex justify-center py-20">
  <LoadingSpinner />
</div>
```

### Occurrences

| File | Lines |
|------|-------|
| `apps/web/src/pages/dashboard.tsx` | 122-124 |
| `apps/web/src/pages/trash.tsx` | 53 |
| `apps/web/src/pages/legal/terms.tsx` | 26 |
| `apps/web/src/pages/legal/privacy.tsx` | 26 |

### Recommendation

This is already fairly concise, but could be extracted as a `<CenteredSpinner />` variant exported from `loading-spinner.tsx` alongside the existing `FullPageSpinner`.

---

## 9. Empty State Pattern

**Priority: LOW -- 2 occurrences**

The centered empty-state with Logo + message follows the same structure.

### Pattern

```tsx
<div className="py-20 text-center">
  <Logo size={N} className="mx-auto opacity-20 mb-4" />
  <p className="text-muted-foreground">Message</p>
</div>
```

### Occurrences

| File | Lines |
|------|-------|
| `apps/web/src/pages/dashboard.tsx` | 126-140 |
| `apps/web/src/pages/trash.tsx` | 55-58 |

### Recommendation

Extract an `EmptyState` component:

```tsx
export function EmptyState({ message, action }: { message: string; action?: ReactNode }) { ... }
```

---

## 10. `AuthGuard` Wrapping in Routes

**Priority: LOW -- 7 occurrences**

Every authenticated route in `app.tsx` wraps its element in `<AuthGuard>`:

```tsx
<Route path="/path" element={<AuthGuard><Component /></AuthGuard>} />
```

### Occurrences

`apps/web/src/app.tsx` lines 33-96 -- seven routes all wrapped individually.

### Recommendation

Use a layout route pattern to apply `AuthGuard` once:

```tsx
<Route element={<AuthGuard><Outlet /></AuthGuard>}>
  <Route path="/" element={<Dashboard />} />
  <Route path="/board/:id" element={<Editor />} />
  <Route path="/settings" element={<Settings />} />
  {/* ... */}
</Route>
```

---

## 11. Upsert Settings Pattern

**Priority: LOW -- 2 occurrences**

The same insert-on-conflict-update pattern for `appSettings` is repeated.

### Pattern

```ts
await db
  .insert(appSettings)
  .values({ key, value, updatedAt: new Date() })
  .onConflictDoUpdate({
    target: appSettings.key,
    set: { value, updatedAt: new Date() },
  });
```

### Occurrences

| File | Lines | Procedure |
|------|-------|-----------|
| `packages/api/src/routers/settings.ts` | 103-117 | `updateRegistration` |
| `packages/api/src/routers/settings.ts` | 246-253 | `updateLegalPage` |

### Recommendation

Extract a helper:

```ts
async function upsertSetting(key: string, value: string) { ... }
```

---

## 12. Username Sanitization Logic

**Priority: LOW -- 2 occurrences**

The same regex-based username sanitization appears in two frontend files.

### Pattern

```ts
e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
```

### Occurrences

| File | Lines |
|------|-------|
| `apps/web/src/pages/setup.tsx` | 89 |
| `apps/web/src/pages/settings/profile.tsx` | 203 |

### Recommendation

Extract to a shared utility:

```ts
// apps/web/src/lib/format.ts
export function sanitizeUsername(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "");
}
```

---

## 13. Form Error Display Pattern

**Priority: LOW -- 3 occurrences**

The error alert block pattern is repeated across authentication forms.

### Pattern

```tsx
{error && (
  <Alert variant="destructive">
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

### Occurrences

| File | Lines |
|------|-------|
| `apps/web/src/pages/login.tsx` | 149-153 |
| `apps/web/src/pages/login.tsx` | 213-217 |
| `apps/web/src/pages/setup.tsx` | 123-127 |

### Recommendation

Extract a small `FormError` component:

```tsx
export function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;
}
```

---

## Summary Table

| # | Pattern | Occurrences | Priority | Effort |
|---|---------|-------------|----------|--------|
| 1 | Ownership check in routers | 13 | HIGH | Medium |
| 2 | R2 binary-to-base64 | 4 | MEDIUM | Low |
| 3 | Excalidraw dynamic import | 2 | MEDIUM | Low |
| 4 | Unsafe user type assertions | 4 | HIGH | Low |
| 5 | Legal page components | 2 (100% identical) | HIGH | Low |
| 6 | Confirmation dialog | 3 | MEDIUM | Low |
| 7 | Page header bar | 7 | LOW | Low |
| 8 | Loading state | 4 | LOW | Trivial |
| 9 | Empty state | 2 | LOW | Low |
| 10 | AuthGuard route wrapping | 7 | LOW | Low |
| 11 | Upsert settings | 2 | LOW | Trivial |
| 12 | Username sanitization | 2 | LOW | Trivial |
| 13 | Form error display | 3 | LOW | Trivial |

### Recommended Action Order

1. **Ownership middleware** (#1) -- highest impact, reduces ~130 lines of duplicated authorization logic and centralizes security checks
2. **User type augmentation** (#4) -- eliminates unsafe casts, prevents bugs if fields are renamed
3. **Legal page consolidation** (#5) -- two entirely identical files reduced to one
4. **R2 helpers** (#2) -- small utility extraction, removes subtle encode/decode duplication
5. **Excalidraw hook** (#3) -- cleaner separation of concerns
6. **ConfirmDialog component** (#6) -- reusable across all destructive actions
7. Everything else as time permits
