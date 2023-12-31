"use client";

import Link from "next/link";

const Page = () => {
    return <div onMouseEnter={() => console.log('Mouse entered')} className="p-6">
        <Link className="text-primary underline-offset-4 hover:underline" target="_blank" href="https://afdian.net/item/608aae78d46b11eda1035254001e7c00">仍在开发中，巨应2的会员可以免费迁移到3</Link></div>;
};

export default Page;
