import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '~/lib/utils'

// Spotify-style — 얇은 화이트 트랙 + 화이트 thumb. 진행 그래프는 primary가
// 아니라 foreground(흰색)를 직접 쓴다. 활성 라인을 그린으로 강조하지 않기
// 위해 의도적으로 분리한 결정.
const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'group relative flex w-full touch-none select-none items-center',
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-foreground/15">
      <SliderPrimitive.Range className="absolute h-full bg-foreground" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-3 w-3 rounded-full bg-foreground shadow-[0_1px_3px_rgba(0,0,0,0.5)] opacity-0 transition-opacity duration-150 hover:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-0 data-[state=active]:opacity-100" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
