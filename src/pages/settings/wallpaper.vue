<template>
    <div class="mx-auto max-w-3xl py-10 px-4 sm:px-6 lg:py-12 lg:px-8">
        <h1 class="text-3xl font-bold tracking-tight text-blue-gray-900">Account</h1>

        <form class="divide-y-blue-gray-200 mt-6 space-y-8 divide-y">
            <div class="grid grid-cols-1 gap-y-6 sm:grid-cols-6 sm:gap-x-6">
                <div class="sm:col-span-6">
                    <h2 class="text-xl font-medium text-blue-gray-900">Profile</h2>
                    <p class="mt-1 text-sm text-blue-gray-500">This information will be displayed
                        publicly so be careful what you share.</p>
                </div>

                <div class="sm:col-span-3">
                    <label for="first-name" class="block text-sm font-medium text-blue-gray-900">First name</label>
                    <input type="text" name="first-name" id="first-name" autocomplete="given-name"
                        class="mt-1 block w-full rounded-md border-blue-gray-300 text-blue-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                </div>

                <div class="sm:col-span-3">
                    <label for="last-name" class="block text-sm font-medium text-blue-gray-900">Last
                        name</label>
                    <input type="text" name="last-name" id="last-name" autocomplete="family-name"
                        class="mt-1 block w-full rounded-md border-blue-gray-300 text-blue-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                </div>

                <div class="sm:col-span-6">
                    <label for="username" class="block text-sm font-medium text-blue-gray-900">Username</label>
                    <div class="mt-1 flex rounded-md shadow-sm">
                        <span
                            class="inline-flex items-center rounded-l-md border border-r-0 border-blue-gray-300 bg-blue-gray-50 px-3 text-blue-gray-500 sm:text-sm">workcation.com/</span>
                        <input type="text" name="username" id="username" autocomplete="username" value="lisamarie"
                            class="block w-full min-w-0 flex-1 rounded-none rounded-r-md border-blue-gray-300 text-blue-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                    </div>
                </div>

                <div class="sm:col-span-6">
                    <label for="photo" class="block text-sm font-medium text-blue-gray-900">Photo</label>
                    <div class="mt-1 flex items-center">
                        <img class="inline-block h-12 w-12 rounded-full"
                            src="https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2.5&w=256&h=256&q=80"
                            alt="" />
                        <div class="ml-4 flex">
                            <div
                                class="relative flex cursor-pointer items-center rounded-md border border-blue-gray-300 bg-white py-2 px-3 shadow-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 focus-within:ring-offset-blue-gray-50 hover:bg-blue-gray-50">
                                <label for="user-photo"
                                    class="pointer-events-none relative text-sm font-medium text-blue-gray-900">
                                    <span>Change</span>
                                    <span class="sr-only"> user photo</span>
                                </label>
                                <input id="user-photo" name="user-photo" type="file"
                                    class="absolute inset-0 h-full w-full cursor-pointer rounded-md border-gray-300 opacity-0" />
                            </div>
                            <button type="button"
                                class="ml-3 rounded-md border border-transparent bg-transparent py-2 px-3 text-sm font-medium text-blue-gray-900 hover:text-blue-gray-700 focus:border-blue-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-blue-gray-50">Remove</button>
                        </div>
                    </div>
                </div>

                <div class="sm:col-span-6">
                    <label for="description" class="block text-sm font-medium text-blue-gray-900">Description</label>
                    <div class="mt-1">
                        <textarea id="description" name="description" rows="4"
                            class="block w-full rounded-md border-blue-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                    </div>
                    <p class="mt-3 text-sm text-blue-gray-500">Brief description for your profile.
                        URLs are hyperlinked.</p>
                </div>

                <div class="sm:col-span-6">
                    <label for="url" class="block text-sm font-medium text-blue-gray-900">URL</label>
                    <input type="text" name="url" id="url"
                        class="mt-1 block w-full rounded-md border-blue-gray-300 text-blue-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                </div>
            </div>

            <div class="grid grid-cols-1 gap-y-6 pt-8 sm:grid-cols-6 sm:gap-x-6">
                <div class="sm:col-span-6">
                    <h2 class="text-xl font-medium text-blue-gray-900">Personal Information</h2>
                    <p class="mt-1 text-sm text-blue-gray-500">This information will be displayed
                        publicly so be careful what you share.</p>
                </div>

                <div class="sm:col-span-3">
                    <label for="email-address" class="block text-sm font-medium text-blue-gray-900">Email address</label>
                    <input type="text" name="email-address" id="email-address" autocomplete="email"
                        class="mt-1 block w-full rounded-md border-blue-gray-300 text-blue-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                </div>

                <div class="sm:col-span-3">
                    <label for="phone-number" class="block text-sm font-medium text-blue-gray-900">Phone number</label>
                    <input type="text" name="phone-number" id="phone-number" autocomplete="tel"
                        class="mt-1 block w-full rounded-md border-blue-gray-300 text-blue-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                </div>

                <div class="sm:col-span-3">
                    <label for="country" class="block text-sm font-medium text-blue-gray-900">Country</label>
                    <select id="country" name="country" autocomplete="country-name"
                        class="mt-1 block w-full rounded-md border-blue-gray-300 text-blue-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                        <option />
                        <option>United States</option>
                        <option>Canada</option>
                        <option>Mexico</option>
                    </select>
                </div>

                <div class="sm:col-span-3">
                    <label for="language" class="block text-sm font-medium text-blue-gray-900">Language</label>
                    <input type="text" name="language" id="language"
                        class="mt-1 block w-full rounded-md border-blue-gray-300 text-blue-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                </div>

                <p class="text-sm text-blue-gray-500 sm:col-span-6">This account was created on
                    <time datetime="2017-01-05T20:35:40">January 5, 2017, 8:35:40 PM</time>.
                </p>
            </div>

            <div class="flex justify-end pt-8">
                <button type="button"
                    class="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-blue-gray-900 shadow-sm hover:bg-blue-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Cancel</button>
                <button type="submit"
                    class="ml-3 inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Save</button>
            </div>
        </form>
    </div>
</template>
<script setup lang="ts">

</script>