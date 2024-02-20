import { Locale } from "@/i18n-config";
import { getDictionary } from "@/get-dictionary";
import Form from "./form";

export default async function LocalPage({
  params: { lang },
}: {
  params: { lang: Locale };
}) {
  const dictionary = await getDictionary(lang);
  return <Form lang={lang} dictionary={dictionary} />;
}
