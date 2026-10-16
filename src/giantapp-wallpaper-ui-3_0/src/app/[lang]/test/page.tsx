import { Locale } from "@/i18n-config";
import { getDictionary } from "@/get-dictionary";
import Form from "./form";

//next 15 起 params 为 Promise；校验器约束 lang 为 string，运行时来自 generateStaticParams 必为 Locale
export default async function IndexPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const lang = (await params).lang as Locale;
  const dictionary = await getDictionary(lang);
  return <Form lang={lang} dictionary={dictionary} />;
}
