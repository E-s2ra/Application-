import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDownLeft01Icon, ArrowLeft01Icon, ArrowRight01Icon, ArrowUpRight01Icon,
  Book02Icon, CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon,
  Clock01Icon, Compass01Icon, FavouriteIcon, HeadphonesIcon, LibraryIcon,
  ListMusicIcon, LockKeyholeIcon, Menu02Icon, MinusIcon, MoreHorizontalIcon,
  PauseIcon, PlayIcon, PlusIcon, Search01Icon, Settings02Icon, Share01Icon,
  ShieldCheckIcon, SkipBackIcon, SkipForwardIcon, SlidersHorizontalIcon,
  SparklesIcon, VolumeHighIcon, VolumeMute01Icon, Cancel01Icon,
} from '@hugeicons/core-free-icons'
import type { ComponentProps, FC } from 'react'

type Glyph = ComponentProps<typeof HugeiconsIcon>['icon']
type Props = { size?: number | string; strokeWidth?: number; fill?: string; className?: string; color?: string }
const adapt = (icon: Glyph): FC<Props> => {
  return function Icon({ size = 20, strokeWidth = 1.7, className, color = 'currentColor' }: Props) {
    return <HugeiconsIcon icon={icon} size={size} strokeWidth={strokeWidth} className={className} color={color} aria-hidden="true" />
  }
}

export const ArrowDownLeft = adapt(ArrowDownLeft01Icon)
export const ArrowLeft = adapt(ArrowLeft01Icon)
export const ArrowRight = adapt(ArrowRight01Icon)
export const ArrowUpRight = adapt(ArrowUpRight01Icon)
export const BookOpen = adapt(Book02Icon)
export const Check = adapt(CheckIcon)
export const ChevronDown = adapt(ChevronDownIcon)
export const ChevronLeft = adapt(ChevronLeftIcon)
export const ChevronRight = adapt(ChevronRightIcon)
export const Clock3 = adapt(Clock01Icon)
export const Compass = adapt(Compass01Icon)
export const Heart = adapt(FavouriteIcon)
export const Headphones = adapt(HeadphonesIcon)
export const Library = adapt(LibraryIcon)
export const ListMusic = adapt(ListMusicIcon)
export const LockKeyhole = adapt(LockKeyholeIcon)
export const Menu = adapt(Menu02Icon)
export const Minus = adapt(MinusIcon)
export const MoreHorizontal = adapt(MoreHorizontalIcon)
export const Pause = adapt(PauseIcon)
export const Play = adapt(PlayIcon)
export const Plus = adapt(PlusIcon)
export const Search = adapt(Search01Icon)
export const Settings2 = adapt(Settings02Icon)
export const Share2 = adapt(Share01Icon)
export const ShieldCheck = adapt(ShieldCheckIcon)
export const SkipBack = adapt(SkipBackIcon)
export const SkipForward = adapt(SkipForwardIcon)
export const SlidersHorizontal = adapt(SlidersHorizontalIcon)
export const Sparkles = adapt(SparklesIcon)
export const Volume2 = adapt(VolumeHighIcon)
export const VolumeX = adapt(VolumeMute01Icon)
export const X = adapt(Cancel01Icon)
