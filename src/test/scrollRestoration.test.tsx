import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom"
import { describe, it, expect, beforeEach } from "vitest"
import { resetScrollPositions, useScrollRestoration } from "@/lib/scrollRestoration"

// jsdom has no layout: give <main> a scroll position and a content height
function fakeScroller(main: HTMLElement, contentHeight: { value: number }) {
  let top = 0
  Object.defineProperty(main, "clientHeight", { configurable: true, get: () => 500 })
  Object.defineProperty(main, "scrollHeight", { configurable: true, get: () => contentHeight.value })
  Object.defineProperty(main, "scrollTop", {
    configurable: true,
    get: () => top,
    set: (value: number) => { top = Math.max(0, Math.min(value, contentHeight.value - 500)) },
  })
}

function scrollTo(main: HTMLElement, top: number) {
  main.scrollTop = top
  main.dispatchEvent(new Event("scroll"))
}

function Nav() {
  const navigate = useNavigate()
  return (
    <>
      <button onClick={() => navigate("/recipe/a")}>open</button>
      <button onClick={() => navigate(-1)}>back</button>
      <button onClick={() => navigate("/?q=pasta", { replace: true })}>search</button>
    </>
  )
}

function Harness() {
  useScrollRestoration()
  return (
    <>
      <Nav />
      <main data-testid="main">
        <Routes>
          <Route path="/" element={<p>list</p>} />
          <Route path="/recipe/:slug" element={<p>recipe</p>} />
        </Routes>
      </main>
    </>
  )
}

describe("scroll restoration", () => {
  const height = { value: 5000 }

  beforeEach(() => {
    resetScrollPositions()
    height.value = 5000
  })

  function setup() {
    const user = userEvent.setup()
    const { unmount } = render(<MemoryRouter><Harness /></MemoryRouter>)
    const main = screen.getByTestId("main")
    fakeScroller(main, height)
    return { user, main, unmount }
  }

  it("opens new pages at the top and goes back to where the list was left", async () => {
    const { user, main } = setup()
    scrollTo(main, 1800)

    await user.click(screen.getByText("open"))
    expect(main.scrollTop).toBe(0)
    scrollTo(main, 300)

    await user.click(screen.getByText("back"))
    expect(screen.getByText("list")).toBeInTheDocument()
    expect(main.scrollTop).toBe(1800)
  })

  it("waits for the page to be tall enough before restoring", async () => {
    const { user, main } = setup()
    scrollTo(main, 1800)
    await user.click(screen.getByText("open"))

    // The list is still loading when coming back
    height.value = 800
    await user.click(screen.getByText("back"))
    expect(main.scrollTop).toBe(300)

    height.value = 5000
    await act(() => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))))
    expect(main.scrollTop).toBe(1800)
  })

  it("keeps the position when only the URL query changes", async () => {
    const { user, main } = setup()
    scrollTo(main, 700)
    await user.click(screen.getByText("search"))
    expect(main.scrollTop).toBe(700)

    await user.click(screen.getByText("open"))
    await user.click(screen.getByText("back"))
    expect(main.scrollTop).toBe(700)
  })
})
