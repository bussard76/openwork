import { createEffect, createMemo, For, Show, type Accessor, type JSX } from "solid-js"
import {
  DragDropProvider,
  DragDropSensors,
  DragOverlay,
  SortableProvider,
  closestCenter,
  type DragEvent,
} from "@thisbeyond/solid-dnd"
import { ConstrainDragXAxis } from "@/utils/solid-dnd"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Icon } from "@opencode-ai/ui/icon"
import { Tooltip, TooltipKeybind } from "@opencode-ai/ui/tooltip"
import { type LocalProject } from "@/context/layout"
import { ResizeHandle } from "@opencode-ai/ui/resize-handle"
import { usePlatform } from "@/context/platform"

export const SidebarContent = (props: {
  mobile?: boolean
  opened: Accessor<boolean>
  aimMove: (event: MouseEvent) => void
  projects: Accessor<LocalProject[]>
  renderProject: (project: LocalProject) => JSX.Element
  handleDragStart: (event: unknown) => void
  handleDragEnd: () => void
  handleDragOver: (event: DragEvent) => void
  openProjectLabel: JSX.Element
  openProjectKeybind: Accessor<string | undefined>
  onOpenProject: () => void
  renderProjectOverlay: () => JSX.Element
  settingsLabel: Accessor<string>
  settingsKeybind: Accessor<string | undefined>
  onOpenSettings: () => void
  helpLabel: Accessor<string>
  onOpenHelp: () => void
  renderPanel: () => JSX.Element
  projectColumnWidth: Accessor<number>
  onProjectColumnResize: (width: number) => void
  projectListHeight: Accessor<number>
  onProjectListResize: (height: number) => void
  projectListCollapsed: Accessor<boolean>
  onToggleProjectList: () => void
  fileTreeOpened: Accessor<boolean>
  onToggleFileTree: () => void
}): JSX.Element => {
  const expanded = createMemo(() => !!props.mobile || props.opened())
  const placement = () => (props.mobile ? "bottom" : "right")
  const platform = usePlatform()
  let panel: HTMLDivElement | undefined

  createEffect(() => {
    const el = panel
    if (!el) return
    if (expanded()) {
      el.removeAttribute("inert")
      return
    }
    el.setAttribute("inert", "")
  })

  return (
    <div class="flex h-full w-full min-w-0 overflow-hidden">
      <div
        data-component="sidebar-rail"
        class="w-16 shrink-0 bg-background-base flex flex-col items-centers overflow-hidden"
        onMouseMove={props.aimMove}
      >
        {/* openwork logo */}
        <div class="shrink-0 px-3 pt-3 pb-2 min-w-0">
          <img
            src="/openwork-logo-v2.png"
            alt="openwork"
            class="h-10 w-auto object-contain object-left"
            style={{ filter: "light-dark(none, invert(1))" }}
          />
        </div>

        <div class="flex-1 min-h-0 w-full overflow-hidden flex flex-col min-w-0">
          {/* Workspaces section */}
          <div
            class="relative flex flex-col"
            classList={{
              "flex-1 min-h-0 overflow-hidden": !props.fileTreeOpened(),
              "shrink-0": props.fileTreeOpened(),
            }}
            style={
              props.fileTreeOpened()
                ? { height: props.projectListCollapsed() ? "32px" : `${props.projectListHeight()}px` }
                : props.projectListCollapsed()
                  ? { height: "32px" }
                  : {}
            }
          >
            {/* Workspaces collapse toggle */}
            <button
              class="shrink-0 w-full flex items-center justify-between px-2 py-1 text-12-medium text-text-weak hover:text-text-base transition-colors"
              onClick={props.onToggleProjectList}
              aria-label="Toggle workspaces"
            >
              <span class="uppercase tracking-wider">Workspaces</span>
              <span
                class="transition-transform duration-150"
                classList={{ "rotate-180": props.projectListCollapsed() }}
              >
                <Icon name="chevron-down" class="size-3" />
              </span>
            </button>

            <Show when={!props.projectListCollapsed()}>
              <div class="flex-1 min-h-0 overflow-hidden">
                <DragDropProvider
                  onDragStart={props.handleDragStart}
                  onDragEnd={props.handleDragEnd}
                  onDragOver={props.handleDragOver}
                  collisionDetector={closestCenter}
                >
                  <DragDropSensors />
                  <ConstrainDragXAxis />
                  <div
                    classList={{
                      "h-full w-full flex flex-col gap-3 px-3 pb-3 overflow-y-auto no-scrollbar": true,
                      "items-center": !expanded(),
                      "items-stretch": expanded(),
                    }}
                  >
                    <SortableProvider ids={props.projects().map((p) => p.worktree)}>
                      <For each={props.projects()}>{(project) => props.renderProject(project)}</For>
                    </SortableProvider>
                    <Tooltip
                      placement={placement()}
                      value={
                        <div class="flex items-center gap-2">
                          <span>{props.openProjectLabel}</span>
                          <Show when={!props.mobile && !!props.openProjectKeybind()}>
                            <span class="text-icon-base text-12-medium">{props.openProjectKeybind()}</span>
                          </Show>
                        </div>
                      }
                    >
                      <IconButton
                        icon="plus"
                        variant="ghost"
                        size="large"
                        onClick={props.onOpenProject}
                        aria-label={typeof props.openProjectLabel === "string" ? props.openProjectLabel : undefined}
                      />
                    </Tooltip>
                  </div>
                  <DragOverlay>{props.renderProjectOverlay()}</DragOverlay>
                </DragDropProvider>
              </div>
            </Show>

            {/* Vertical resize handle between project list and file tree */}
            <Show when={!props.projectListCollapsed() && props.fileTreeOpened()}>
              <ResizeHandle
                direction="vertical"
                edge="end"
                size={props.projectListHeight()}
                min={80}
                max={600}
                onResize={props.onProjectListResize}
              />
            </Show>
          </div>

          {/* File tree section — toggle always visible, content collapses */}
          <div
            class="flex flex-col overflow-hidden border-t border-border-weak-base"
            classList={{ "flex-1 min-h-0": props.fileTreeOpened(), "shrink-0": !props.fileTreeOpened() }}
          >
            <button
              class="shrink-0 w-full flex items-center justify-between px-2 py-1 text-12-medium text-text-weak hover:text-text-base transition-colors"
              onClick={props.onToggleFileTree}
              aria-label="Toggle file tree"
            >
              <span class="uppercase tracking-wider">Files</span>
              <span class="transition-transform duration-150" classList={{ "rotate-180": !props.fileTreeOpened() }}>
                <Icon name="chevron-down" class="size-3" />
              </span>
            </button>
            {/* File tree panel — populated via Portal from session page */}
            <Show when={props.fileTreeOpened()}>
              <div id="sidebar-file-tree-slot" class="flex-1 min-h-0 relative" />
            </Show>
          </div>
        </div>

        <div
          classList={{
            "shrink-0 w-full pt-3 pb-6 flex flex-col gap-2": true,
            "items-center": !expanded(),
            "items-start px-3": expanded(),
          }}
        >
          <TooltipKeybind placement={placement()} title={props.settingsLabel()} keybind={props.settingsKeybind() ?? ""}>
            <IconButton
              icon="settings-gear"
              variant="ghost"
              size="large"
              onClick={props.onOpenSettings}
              aria-label={props.settingsLabel()}
            />
          </TooltipKeybind>
          <Tooltip placement={placement()} value={props.helpLabel()}>
            <IconButton
              icon="help"
              variant="ghost"
              size="large"
              onClick={props.onOpenHelp}
              aria-label={props.helpLabel()}
            />
          </Tooltip>
          <Show when={expanded() && platform.version}>
            <div class="flex flex-col gap-0.5 mt-1">
              <span class="text-10-regular text-text-weak opacity-50">v{platform.version}</span>
              <Show when={platform.opencodeVersion}>
                <span class="text-10-regular text-text-weak opacity-40">OpenCode v{platform.opencodeVersion}</span>
              </Show>
            </div>
          </Show>
        </div>
        <Show when={!props.mobile}>
          <ResizeHandle
            direction="horizontal"
            size={props.projectColumnWidth()}
            min={64}
            max={500}
            onResize={props.onProjectColumnResize}
          />
        </Show>
      </div>

      <div
        ref={(el) => {
          panel = el
        }}
        classList={{ "flex-1 flex h-full min-h-0 min-w-0 overflow-hidden": true, "pointer-events-none": !expanded() }}
        aria-hidden={!expanded()}
      >
        {props.renderPanel()}
      </div>
    </div>
  )
}
