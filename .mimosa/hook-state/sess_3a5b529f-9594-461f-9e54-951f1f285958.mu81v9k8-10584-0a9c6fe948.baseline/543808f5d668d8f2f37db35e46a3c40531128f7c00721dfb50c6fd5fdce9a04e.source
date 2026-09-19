"use client"

import * as React from "react"
import { useLocation } from "react-router-dom"

import { useConfig } from "@/hooks/use-config"

export function ThemeSwitcher() {
    const [config] = useConfig()
    const location = useLocation()
    const segment = location.pathname

    React.useEffect(() => {
        document.body.classList.forEach((className) => {
            if (className.match(/^theme.*/)) {
                document.body.classList.remove(className)
            }
        })

        return document.body.classList.add(`theme-${config.theme}`)
    }, [segment, config])

    return null
}
