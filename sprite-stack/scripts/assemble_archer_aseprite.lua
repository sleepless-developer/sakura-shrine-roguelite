-- Aseprite batch assembly for the animated sprite-stack rogue archer
local dir = app.params["dir"]
assert(dir, "pass --script-param dir=<out_dir>")
local sep = "\\"
local function p(...) return table.concat({dir, ...}, sep) end

local f = io.open(p("archer_stack.json"), "r"); local meta = f:read("a"); f:close()
local nslices = tonumber(meta:match('"slices":%s*(%d+)'))
local ndirs = tonumber(meta:match('"directions":%s*(%d+)'))
local sw = tonumber(meta:match('"slice_w":%s*(%d+)'))

local function hex(h)
  return Color{ r=tonumber(h:sub(1,2),16), g=tonumber(h:sub(3,4),16), b=tonumber(h:sub(5,6),16), a=255 }
end
local palHex = {
  "131223","1a1a29","292b37","434756","656a78","888e9c",
  "a87018","dfa528","fae04b","c47861","e8a882","f6c8a2",
  "20192a","9aa1bc","ffffff","3d2a23","634436","c4cad6",
  "767f92","9ea5b5","d5dae4","f3f5fa"
}
local function makePalette()
  local pal = Palette(#palHex + 1)
  pal:setColor(0, Color{ r=0, g=0, b=0, a=0 })
  for i, h in ipairs(palHex) do pal:setColor(i, hex(h)) end
  return pal
end
local function img(path) return Image{ fromFile = path } end
local function toIndexed(spr)
  app.activeSprite = spr
  spr:setPalette(makePalette())
  app.command.ChangePixelFormat{ format="indexed", dithering="none" }
end
local function exportSheet(spr, texture, data, columns)
  app.activeSprite = spr
  app.command.ExportSpriteSheet{
    ui=false, askOverwrite=false,
    type=SpriteSheetType.ROWS, columns=columns,
    textureFilename=texture, dataFilename=data,
    dataFormat=SpriteSheetDataFormat.JSON_ARRAY,
    borderPadding=0, shapePadding=0, innerPadding=0, trim=false,
    listLayers=false, listTags=true, listSlices=false, splitLayers=false }
end

-- 1) 4-view turnaround (Top / Side / Front / Back)
local fvImg = img(p("archer_4view.png"))
local FV = Sprite(fvImg.width, fvImg.height, ColorMode.RGB)
FV.layers[1].name = "4views_top_side_front_back"
FV:newCel(FV.layers[1], 1, fvImg, Point(0, 0))
toIndexed(FV)
FV:saveAs(p("archer_4view.aseprite"))

-- 2) slices as LAYERS & FRAMES
local L = Sprite(sw, sw, ColorMode.RGB)
for k = 0, nslices - 1 do
  local layer = (k == 0) and L.layers[1] or L:newLayer()
  layer.name = string.format("slice_%02d", k)
  L:newCel(layer, 1, img(p("slices", string.format("slice_%02d.png", k))), Point(0, 0))
end
toIndexed(L)
L:saveAs(p("archer_slices_layers.aseprite"))

local S = Sprite(sw, sw, ColorMode.RGB)
for k = 0, nslices - 1 do
  if k > 0 then S:newEmptyFrame() end
  S:newCel(S.layers[1], k + 1, img(p("slices", string.format("slice_%02d.png", k))), Point(0, 0))
end
S.layers[1].name = "slices"
toIndexed(S)
S:saveAs(p("archer_slices_frames.aseprite"))
exportSheet(S, p("archer_stack_sheet.png"), p("archer_stack_sheet.json"), nslices)

-- 3) baked rotations (16 & 32 directions)
local function rotationSprite(step, name, cols)
  local first = img(p("frames", "rot_00.png"))
  local R = Sprite(first.width, first.height, ColorMode.RGB)
  local n = 0
  for d = 0, ndirs - 1, step do
    n = n + 1
    if n > 1 then R:newEmptyFrame() end
    R:newCel(R.layers[1], n, img(p("frames", string.format("rot_%02d.png", d))), Point(0, 0))
    R.frames[n].duration = 0.06 * step
  end
  R.layers[1].name = "archer"
  R:newTag(1, n).name = "rotate"
  toIndexed(R)
  R:saveAs(p(name .. ".aseprite"))
  exportSheet(R, p(name .. "_sheet.png"), p(name .. "_sheet.json"), cols)
end
rotationSprite(1, "archer_rot32", 8)
rotationSprite(2, "archer_rot16", 8)

-- 4) animated GIFs + .aseprite for idle (4f), run (6f), shoot (6f)
local function buildAnim(name, count, durs)
  local first = img(p("anim_frames", string.format("%s_00.png", name)))
  local A = Sprite(first.width, first.height, ColorMode.RGB)
  for i = 0, count - 1 do
    if i > 0 then A:newEmptyFrame() end
    A:newCel(A.layers[1], i + 1, img(p("anim_frames", string.format("%s_%02d.png", name, i))), Point(0, 0))
    A.frames[i + 1].duration = durs[i + 1]
  end
  A.layers[1].name = name
  A:newTag(1, count).name = name
  A:saveAs(p("archer_" .. name .. "_preview.aseprite"))
  A:saveCopyAs(p("archer_" .. name .. "_preview.gif"))
end
buildAnim("idle",  4, {0.20, 0.20, 0.20, 0.20})
buildAnim("run",   6, {0.09, 0.09, 0.09, 0.09, 0.09, 0.09})
buildAnim("shoot", 6, {0.11, 0.11, 0.16, 0.08, 0.09, 0.12})

print("ASEPRITE_ANIMS_DONE")
