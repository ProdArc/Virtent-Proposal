import { logoutAction } from "@/app/logout/actions";

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className={
          className ?? "text-xs font-medium text-[#71717A] hover:text-[#18181B] transition-colors"
        }
      >
        Sair
      </button>
    </form>
  );
}
