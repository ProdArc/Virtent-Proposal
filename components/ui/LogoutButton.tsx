import { logoutAction } from "@/app/logout/actions";

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className={
          className ?? "text-xs font-medium text-secondary-ink hover:text-ink transition-colors"
        }
      >
        Sair
      </button>
    </form>
  );
}
