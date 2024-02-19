import { Locale } from "@/i18n-config";
import { getDictionary } from "@/get-dictionary";

export default async function IndexPage({
    params: { lang },
}: {
    params: { lang: Locale };
}) {
    const dictionary = await getDictionary(lang);

    return (
        <>
            <p>Current locale: {lang}</p>
            <p>
                This text is rendered on the server:{" "}
                {dictionary["server-component"].welcome}
            </p>
        </>
    );
}
