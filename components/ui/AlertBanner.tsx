/*
 * AlertBanner — переиспользуемое сообщение ошибки/успеха/инфо
 */
interface Props {
  type?: "error" | "success" | "info";
  message: string;
}

const styles: Record<string, string> = {
  error:
    "border-red-300 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
  success:
    "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
  info:
    "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400",
};

export function AlertBanner({ type = "info", message }: Props) {
  return (
    <div
      className={`rounded-lg border px-4 py-2.5 text-sm ${styles[type]}`}
    >
      {message}
    </div>
  );
}
