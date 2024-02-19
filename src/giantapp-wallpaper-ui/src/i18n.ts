import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// Can be imported from a shared config
const locales = ['zh', 'en'];

export default getRequestConfig(async ({ locale }) => {
    // Validate that the incoming `locale` parameter is valid
    if (!locales.includes(locale as any)) notFound();

    return {
        messages: (await import(`../messages/${locale}.json`)).default
    };
});