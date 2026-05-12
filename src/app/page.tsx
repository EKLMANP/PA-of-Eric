import Link from "next/link";
import { Card } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="space-y-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          一次 30 分鐘，準備兩人 6 餐
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          輸入你的體重、體脂與目標，EatPlan 會用台灣 Costco 食材幫你規劃每週菜單、
          自動算營養素並輸出採購清單。
        </p>
        <div className="flex gap-3">
          <Link
            href="/onboarding"
            className="rounded-lg bg-brand-600 px-5 py-3 text-white font-medium hover:bg-brand-700"
          >
            開始規劃
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-300 px-5 py-3 font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            查看總覽
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <h3 className="font-semibold mb-2">個人化營養</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            依 BMR/TDEE、目標時程自動計算每日熱量與三大營養素，並檢查目標可行性。
          </p>
        </Card>
        <Card>
          <h3 className="font-semibold mb-2">Batch Cooking</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            6 餐共用備料，30 分鐘內完成，含冷藏 / 復熱建議。
          </p>
        </Card>
        <Card>
          <h3 className="font-semibold mb-2">Costco 採購清單</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            合併食材、依包裝向上取整、預估總價，行動裝置與列印友善。
          </p>
        </Card>
      </section>
    </div>
  );
}
