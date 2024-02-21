"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getGlobal } from "@/i18n-config";

const Page = () => {
    const dictionary = getGlobal();
    return <div onMouseEnter={() => console.log('Mouse entered')} className="p-6">
        <div className="pl-4">
            {dictionary['hub'].still_in_development}<br />
            {dictionary['hub'].download_wallpaper_with_v2}<br />
            {dictionary['hub'].set_same_directory_for_wallpapers_2_and_3}<br />
        </div>
        <Button variant="outline">
            <Link target="_blank" href="https://afdian.net/item/608aae78d46b11eda1035254001e7c00">
                {dictionary['hub'].membership_upgrade_to_v3}
            </Link>
        </Button>
    </div>;
};

export default Page;
