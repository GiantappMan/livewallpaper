import { Locale } from "@/i18n-config";
import { getDictionary } from "@/get-dictionary";
import Form from "./form";

export default async function AboutPage({
  params: { lang },
}: {
  params: { lang: Locale };
}) {
  const dictionary = await getDictionary(lang);
  return <Form dictionary={dictionary} />;
}
