//% color="#89acc8" icon="\uf03e" block="Image Mapping"
//% groups=['Quad Mapping', 'Region Mapping', 'Outlines', 'Query', 'others']
namespace imagemapping {

    const EPSILON = 0.00001
    const TRANSPARENT_COLOR = 0

    export enum RegionSize {
        //% block="width"
        Width = 0,
        //% block="height"
        Height = 1
    }

    export enum QuadCorner {
        //% block="TL"
        TL = 0,
        //% block="TR"
        TR = 1,
        //% block="BL"
        BL = 2,
        //% block="BR"
        BR = 3
    }

    function sampleTiledInterpolated(source: Image, u: number, v: number): number {
        const w = source.width
        const h = source.height
        if (w <= 0 || h <= 0) return TRANSPARENT_COLOR

        const u0 = Math.floor(u)
        const v0 = Math.floor(v)
        const fx = u - u0
        const fy = v - v0

        const x0 = ((u0 % w) + w) % w
        const y0 = ((v0 % h) + h) % h
        const x1 = (x0 + 1) % w
        const y1 = (y0 + 1) % h

        const c00 = source.getPixel(x0, y0)
        const c10 = source.getPixel(x1, y0)
        const c01 = source.getPixel(x0, y1)
        const c11 = source.getPixel(x1, y1)

        const w00 = (1 - fx) * (1 - fy)
        const w10 = fx * (1 - fy)
        const w01 = (1 - fx) * fy
        const w11 = fx * fy

        const scores: number[] = []
        scores[c00] = (scores[c00] || 0) + w00
        scores[c10] = (scores[c10] || 0) + w10
        scores[c01] = (scores[c01] || 0) + w01
        scores[c11] = (scores[c11] || 0) + w11

        let bestColor = TRANSPARENT_COLOR
        let bestScore = -1
        for (let color = 0; color < scores.length; color++) {
            const score = scores[color] || 0
            if (score > bestScore) {
                bestScore = score
                bestColor = color
            }
        }

        return bestColor
    }

    function sampleImageInterpolated(source: Image, u: number, v: number): number {
        const w = source.width
        const h = source.height
        if (w <= 0 || h <= 0) return TRANSPARENT_COLOR
        if (u < 0 || v < 0 || u > w - 1 || v > h - 1) return TRANSPARENT_COLOR

        const u0 = Math.floor(u)
        const v0 = Math.floor(v)
        const fx = u - u0
        const fy = v - v0

        const x0 = u0
        const y0 = v0
        const x1 = Math.min(u0 + 1, w - 1)
        const y1 = Math.min(v0 + 1, h - 1)

        const c00 = source.getPixel(x0, y0)
        const c10 = source.getPixel(x1, y0)
        const c01 = source.getPixel(x0, y1)
        const c11 = source.getPixel(x1, y1)

        const w00 = (1 - fx) * (1 - fy)
        const w10 = fx * (1 - fy)
        const w01 = (1 - fx) * fy
        const w11 = fx * fy

        const scores: number[] = []
        scores[c00] = (scores[c00] || 0) + w00
        scores[c10] = (scores[c10] || 0) + w10
        scores[c01] = (scores[c01] || 0) + w01
        scores[c11] = (scores[c11] || 0) + w11

        let bestColor = TRANSPARENT_COLOR
        let bestScore = -1
        for (let color = 0; color < scores.length; color++) {
            const score = scores[color] || 0
            if (score > bestScore) {
                bestScore = score
                bestColor = color
            }
        }

        return bestColor
    }

    function trySolveQuadST(
        x0: number, y0: number,
        x1: number, y1: number,
        x2: number, y2: number,
        x3: number, y3: number,
        px: number, py: number,
        startS: number, startT: number
    ): number[] {
        let s = startS
        let t = startT

        for (let iter = 0; iter < 8; iter++) {
            const qx =
                (1 - s) * (1 - t) * x0 +
                s * (1 - t) * x1 +
                s * t * x2 +
                (1 - s) * t * x3
            const qy =
                (1 - s) * (1 - t) * y0 +
                s * (1 - t) * y1 +
                s * t * y2 +
                (1 - s) * t * y3

            const fx = qx - px
            const fy = qy - py
            if (Math.abs(fx) + Math.abs(fy) < 0.001) {
                return [s, t]
            }

            const dxds = (1 - t) * (x1 - x0) + t * (x2 - x3)
            const dxdt = (1 - s) * (x3 - x0) + s * (x2 - x1)
            const dyds = (1 - t) * (y1 - y0) + t * (y2 - y3)
            const dydt = (1 - s) * (y3 - y0) + s * (y2 - y1)

            const det = dxds * dydt - dxdt * dyds
            if (Math.abs(det) < EPSILON) break

            const ds = (fx * dydt - fy * dxdt) / det
            const dt = (fy * dxds - fx * dyds) / det

            s -= ds
            t -= dt
        }

        return []
    }

    function getColorRegionBounds(img: Image, color: number): number[] {
        const w = img.width
        const h = img.height
        let minX = w, minY = h
        let maxX = -1, maxY = -1

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (img.getPixel(x, y) == color) {
                    if (x < minX) minX = x
                    if (x > maxX) maxX = x
                    if (y < minY) minY = y
                    if (y > maxY) maxY = y
                }
            }
        }

        if (maxX < minX || maxY < minY) return []
        return [minX, minY, maxX, maxY]
    }

    function makeDiskOffsets(radius: number): number[] {
        const offsets: number[] = []
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy <= radius * radius) {
                    offsets.push(dx)
                    offsets.push(dy)
                }
            }
        }
        return offsets
    }

    function collectEdgePixelsForTransparency(base: Image, backgroundColor: number): number[] {
        const edgePixels: number[] = []
        const w = base.width
        const h = base.height

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (base.getPixel(x, y) == backgroundColor) continue

                let isEdge = false
                for (let ny = y - 1; ny <= y + 1 && !isEdge; ny++) {
                    for (let nx = x - 1; nx <= x + 1; nx++) {
                        if (nx == x && ny == y) continue
                        if (nx < 0 || ny < 0 || nx >= w || ny >= h || base.getPixel(nx, ny) == backgroundColor) {
                            isEdge = true
                            break
                        }
                    }
                }

                if (isEdge) {
                    edgePixels.push(x)
                    edgePixels.push(y)
                }
            }
        }

        return edgePixels
    }

    function collectEdgePixelsForRegionColor(base: Image, regionColor: number): number[] {
        const edgePixels: number[] = []
        const w = base.width
        const h = base.height

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (base.getPixel(x, y) != regionColor) continue

                let isEdge = false
                for (let ny = y - 1; ny <= y + 1 && !isEdge; ny++) {
                    for (let nx = x - 1; nx <= x + 1; nx++) {
                        if (nx == x && ny == y) continue
                        if (nx < 0 || ny < 0 || nx >= w || ny >= h || base.getPixel(nx, ny) != regionColor) {
                            isEdge = true
                            break
                        }
                    }
                }

                if (isEdge) {
                    edgePixels.push(x)
                    edgePixels.push(y)
                }
            }
        }

        return edgePixels
    }

    function applyOutlineFromEdgesToTransparency(base: Image, target: Image, edgePixels: number[], backgroundColor: number, outlineColor: number, thickness: number) {
        const w = base.width
        const h = base.height
        const mark: number[] = []
        const offsets = makeDiskOffsets(thickness)

        for (let i = 0; i < edgePixels.length; i += 2) {
            const ex = edgePixels[i]
            const ey = edgePixels[i + 1]

            for (let j = 0; j < offsets.length; j += 2) {
                const nx = ex + offsets[j]
                const ny = ey + offsets[j + 1]
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
                if (base.getPixel(nx, ny) != backgroundColor) continue

                mark[ny * w + nx] = 1
            }
        }

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (mark[y * w + x]) {
                    target.setPixel(x, y, outlineColor)
                }
            }
        }
    }

    function applyOutlineFromEdgesToNonRegion(base: Image, target: Image, edgePixels: number[], regionColor: number, outlineColor: number, thickness: number) {
        const w = base.width
        const h = base.height
        const mark: number[] = []
        const offsets = makeDiskOffsets(thickness)

        for (let i = 0; i < edgePixels.length; i += 2) {
            const ex = edgePixels[i]
            const ey = edgePixels[i + 1]

            for (let j = 0; j < offsets.length; j += 2) {
                const nx = ex + offsets[j]
                const ny = ey + offsets[j + 1]
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
                if (base.getPixel(nx, ny) == regionColor) continue

                mark[ny * w + nx] = 1
            }
        }

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (mark[y * w + x]) {
                    target.setPixel(x, y, outlineColor)
                }
            }
        }
    }


    //% group="Quad Mapping"
    //% weight=400
    //% help=README#map-to-quad
    //% blockId=imagemapping_map_to_quad
    //% block="map $texture to quad x points $xPoints y points $yPoints on $target"
    //% texture.shadow=screen_image_picker
    //% target.shadow=screen_image_picker
    export function mapImageToQuad(
        texture: Image,
        xPoints: number[],
        yPoints: number[],
        target: Image
    ) {
        if (!texture || !target) return
        if (!xPoints || !yPoints) return
        if (xPoints.length < 4 || yPoints.length < 4) return

        // Input corner order is TL, TR, BL, BR.
        // Internal quad mapping expects TL, TR, BR, BL.
        const x0 = xPoints[0], y0 = yPoints[0] // TL
        const x1 = xPoints[1], y1 = yPoints[1] // TR
        const x2 = xPoints[3], y2 = yPoints[3] // BR
        const x3 = xPoints[2], y3 = yPoints[2] // BL

        const minX = Math.max(0, Math.floor(Math.min(x0, Math.min(x1, Math.min(x2, x3)))))
        const maxX = Math.min(target.width - 1, Math.ceil(Math.max(x0, Math.max(x1, Math.max(x2, x3)))))
        const minY = Math.max(0, Math.floor(Math.min(y0, Math.min(y1, Math.min(y2, y3)))))
        const maxY = Math.min(target.height - 1, Math.ceil(Math.max(y0, Math.max(y1, Math.max(y2, y3)))))

        const texW = texture.width - 1
        const texH = texture.height - 1
        const invW = Math.max(1, maxX - minX)
        const invH = Math.max(1, maxY - minY)

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const px = x + 0.5
                const py = y + 0.5

                const seedS = Math.min(1, Math.max(0, (px - minX) / invW))
                const seedT = Math.min(1, Math.max(0, (py - minY) / invH))
                let solved: number[] = trySolveQuadST(x0, y0, x1, y1, x2, y2, x3, y3, px, py, seedS, seedT)
                if (solved.length < 2) solved = trySolveQuadST(x0, y0, x1, y1, x2, y2, x3, y3, px, py, 0, 0)
                if (solved.length < 2) solved = trySolveQuadST(x0, y0, x1, y1, x2, y2, x3, y3, px, py, 1, 0)
                if (solved.length < 2) solved = trySolveQuadST(x0, y0, x1, y1, x2, y2, x3, y3, px, py, 1, 1)
                if (solved.length < 2) solved = trySolveQuadST(x0, y0, x1, y1, x2, y2, x3, y3, px, py, 0, 1)
                if (solved.length < 2) continue

                let s = solved[0]
                let t = solved[1]

                if (s < -0.01 || s > 1.01 || t < -0.01 || t > 1.01) continue
                if (s < 0) s = 0
                else if (s > 1) s = 1
                if (t < 0) t = 0
                else if (t > 1) t = 1

                const u = s * texW
                const v = t * texH
                const col = sampleImageInterpolated(texture, u, v)
                if (col != TRANSPARENT_COLOR) {
                    target.setPixel(x, y, col)
                }
            }
        }
    }

    //% group="Quad Mapping"
    //% weight=395
    //% help=README#mapped-copy-to-quad
    //% blockId=imagemapping_mapped_copy_to_quad
    //% block="mapped copy of $target from $texture to quad x points $xPoints y points $yPoints"
    //% texture.shadow=screen_image_picker
    //% target.shadow=screen_image_picker
    export function mappedImageToQuad(
        texture: Image,
        xPoints: number[],
        yPoints: number[],
        target: Image
    ): Image {
        if (!target) return null
        const out = target.clone()
        mapImageToQuad(texture, xPoints, yPoints, out)
        return out
    }

    //% group="Region Mapping"
    //% weight=300
    //% help=README#map-to-color-region
    //% blockId=imagemapping_map_to_color_region
    //% block="map $source into color $color region on $target"
    //% source.shadow=screen_image_picker
    //% target.shadow=screen_image_picker
    export function mapImageToColorRegion(
        source: Image,
        color: number,
        target: Image
    ) {
        if (!source || !target) return
        if (source.width <= 0 || source.height <= 0) return

        const w = target.width
        const h = target.height
        const bounds = getColorRegionBounds(target, color)
        if (bounds.length < 4) return
        const minX = bounds[0]
        const minY = bounds[1]
        const maxX = bounds[2]
        const maxY = bounds[3]
        if (maxX <= minX || maxY <= minY) return

        const rowMin: number[] = []
        const rowMax: number[] = []
        const colMin: number[] = []
        const colMax: number[] = []

        for (let y = minY; y <= maxY; y++) {
            let rMin = w, rMax = -1
            for (let x = minX; x <= maxX; x++) {
                if (target.getPixel(x, y) == color) {
                    if (x < rMin) rMin = x
                    if (x > rMax) rMax = x
                }
            }
            rowMin.push(rMin)
            rowMax.push(rMax)
        }

        for (let x = minX; x <= maxX; x++) {
            let cMin = h, cMax = -1
            for (let y = minY; y <= maxY; y++) {
                if (target.getPixel(x, y) == color) {
                    if (y < cMin) cMin = y
                    if (y > cMax) cMax = y
                }
            }
            colMin.push(cMin)
            colMax.push(cMax)
        }

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {

                if (target.getPixel(x, y) != color) continue

                const rMin = rowMin[y - minY]
                const rMax = rowMax[y - minY]
                const cMin = colMin[x - minX]
                const cMax = colMax[x - minX]

                if (rMax <= rMin || cMax <= cMin) continue

                const u = (x - rMin) / (rMax - rMin)
                const v = (y - cMin) / (cMax - cMin)

                const texX = Math.floor(u * (source.width - 1))
                const texY = Math.floor(v * (source.height - 1))

                const col = source.getPixel(texX, texY)
                if (col != TRANSPARENT_COLOR)
                    target.setPixel(x, y, col)
            }
        }
    }

    //% group="Region Mapping"
    //% weight=295
    //% help=README#mapped-copy-to-color-region
    //% blockId=imagemapping_mapped_copy_to_color_region
    //% block="mapped copy of $target from $source into color $color region"
    //% source.shadow=screen_image_picker
    //% target.shadow=screen_image_picker
    export function mappedImageToColorRegion(
        source: Image,
        color: number,
        target: Image
    ): Image {
        if (!target) return null
        const out = target.clone()
        mapImageToColorRegion(source, color, out)
        return out
    }

    //% group="Region Mapping"
    //% weight=285
    //% help=README#region-size
    //% blockId=imagemapping_region_size
    //% block="$size of color $color region in $img"
    //% img.shadow=screen_image_picker
    export function colorRegionSize(img: Image, color: number, size: RegionSize): number {
        if (!img) return 0
        const bounds = getColorRegionBounds(img, color)
        if (bounds.length < 4) return 0
        const minX = bounds[0]
        const minY = bounds[1]
        const maxX = bounds[2]
        const maxY = bounds[3]

        if (size == RegionSize.Height) return maxY - minY + 1
        return maxX - minX + 1
    }

    //% group="Region Mapping"
    //% weight=282
    //% help=README#color-region-image
    //% blockId=imagemapping_extract_color_region_image
    //% block="color region image of color $color in $img"
    //% img.shadow=screen_image_picker
    export function colorRegionImage(img: Image, color: number): Image {
        if (!img) return null
        const bounds = getColorRegionBounds(img, color)
        if (bounds.length < 4) return image.create(1, 1)

        const minX = bounds[0]
        const minY = bounds[1]
        const maxX = bounds[2]
        const maxY = bounds[3]
        const outW = maxX - minX + 1
        const outH = maxY - minY + 1
        const out = image.create(outW, outH)

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const px = img.getPixel(x, y)
                if (px == color) {
                    out.setPixel(x - minX, y - minY, px)
                }
            }
        }

        return out
    }

    //% group="Region Mapping"
    //% weight=280
    //% help=README#tile-map-to-color-region
    //% blockId=imagemapping_tile_crop_to_color_region
    //% block="crop $source into color $color region on $target scale $tileScale offset x $offsetX y $offsetY"
    //% source.shadow=screen_image_picker
    //% target.shadow=screen_image_picker
    //% tileScale.min=0.1
    //% tileScale.defl=1
    export function cropMapToColorRegion(
        source: Image,
        color: number,
        target: Image,
        tileScale: number,
        offsetX: number,
        offsetY: number
    ) {
        if (!source || !target) return
        if (source.width <= 0 || source.height <= 0) return

        const scale = Math.max(0.1, tileScale)
        const bounds = getColorRegionBounds(target, color)
        if (bounds.length < 4) return
        const minX = bounds[0]
        const minY = bounds[1]
        const maxX = bounds[2]
        const maxY = bounds[3]

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (target.getPixel(x, y) != color) continue

                const srcU = (x - minX + offsetX) / scale
                const srcV = (y - minY + offsetY) / scale
                const col = sampleTiledInterpolated(source, srcU, srcV)
                if (col != TRANSPARENT_COLOR) {
                    target.setPixel(x, y, col)
                }
            }
        }
    }

    //% group="Region Mapping"
    //% weight=275
    //% help=README#cropped-copy-to-color-region
    //% blockId=imagemapping_cropped_copy_to_color_region
    //% block="cropped copy of $target from $source into color $color region scale $tileScale offset x $offsetX y $offsetY"
    //% source.shadow=screen_image_picker
    //% target.shadow=screen_image_picker
    //% tileScale.min=0.1
    //% tileScale.defl=1
    export function croppedImageToColorRegion(
        source: Image,
        color: number,
        target: Image,
        tileScale: number,
        offsetX: number,
        offsetY: number
    ): Image {
        if (!target) return null
        const out = target.clone()
        cropMapToColorRegion(source, color, out, tileScale, offsetX, offsetY)
        return out
    }

    //% group="Outlines"
    //% weight=200
    //% help=README#draw-total-outline
    //% blockId=imagemapping_draw_transparency_outline
    //% block="draw total outline on $img color $outlineColor thickness $thickness background color $backgroundColor"
    //% img.shadow=screen_image_picker
    //% thickness.min=1
    //% thickness.defl=1
    //% backgroundColor.defl=0
    export function drawTransparencyEdgeOutline(img: Image, outlineColor: number, thickness: number = 1, backgroundColor: number = TRANSPARENT_COLOR) {
        if (!img) return

        const radius = Math.max(1, Math.floor(thickness))
        const base = img.clone()
        const edgePixels = collectEdgePixelsForTransparency(base, backgroundColor)
        applyOutlineFromEdgesToTransparency(base, img, edgePixels, backgroundColor, outlineColor, radius)
    }

    //% group="Outlines"
    //% weight=195
    //% help=README#outlined-transparency-copy
    //% blockId=imagemapping_outlined_transparency_copy
    //% block="outlined copy of $img with total outline color $outlineColor thickness $thickness background color $backgroundColor"
    //% img.shadow=screen_image_picker
    //% thickness.min=1
    //% thickness.defl=1
    //% backgroundColor.defl=0
    export function outlinedTransparencyEdgeImage(img: Image, outlineColor: number, thickness: number = 1, backgroundColor: number = TRANSPARENT_COLOR): Image {
        if (!img) return null
        const out = img.clone()
        drawTransparencyEdgeOutline(out, outlineColor, thickness, backgroundColor)
        return out
    }

    //% group="Outlines"
    //% weight=190
    //% help=README#draw-region-outline
    //% blockId=imagemapping_draw_region_outline
    //% block="draw outline around color $regionColor on $img color $outlineColor thickness $thickness"
    //% img.shadow=screen_image_picker
    //% thickness.min=1
    //% thickness.defl=1
    export function drawColorEdgeOutline(img: Image, regionColor: number, outlineColor: number, thickness: number = 1) {
        if (!img) return

        const radius = Math.max(1, Math.floor(thickness))
        const base = img.clone()
        const edgePixels = collectEdgePixelsForRegionColor(base, regionColor)
        applyOutlineFromEdgesToNonRegion(base, img, edgePixels, regionColor, outlineColor, radius)
    }

    //% group="Outlines"
    //% weight=185
    //% help=README#outlined-region-copy
    //% blockId=imagemapping_outlined_region_copy
    //% block="outlined copy of $img around color $regionColor color $outlineColor thickness $thickness"
    //% img.shadow=screen_image_picker
    //% thickness.min=1
    //% thickness.defl=1
    export function outlinedColorEdgeImage(img: Image, regionColor: number, outlineColor: number, thickness: number = 1): Image {
        if (!img) return null
        const out = img.clone()
        drawColorEdgeOutline(out, regionColor, outlineColor, thickness)
        return out
    }

    //% group="Query"
    //% weight=105
    //% help=README#set-quad-corner
    //% blockId=imagemapping_set_quad_corner
    //% block="set $corner in x points $xPoints y points $yPoints point to x $x y $y"
    export function setQuadCorner(
        corner: QuadCorner,
        xPoints: number[],
        yPoints: number[],
        x: number,
        y: number
    ) {
        if (!xPoints || !yPoints) return
        if (xPoints.length < 4 || yPoints.length < 4) return

        const i = corner
        if (i < 0 || i > 3) return

        xPoints[i] = x
        yPoints[i] = y
    }

    //% group="Query"
    //% weight=100
    //% help=README#make-quad-x-points
    //% blockId=imagemapping_make_quad_x_points
    //% block="make quad x points TL $xTL TR $xTR BL $xBL BR $xBR"
    export function makeQuadXPoints(xTL: number, xTR: number, xBL: number, xBR: number): number[] {
        return [xTL, xTR, xBL, xBR]
    }

    //% group="Query"
    //% weight=95
    //% help=README#make-quad-y-points
    //% blockId=imagemapping_make_quad_y_points
    //% block="make quad y points TL $yTL TR $yTR BL $yBL BR $yBR"
    export function makeQuadYPoints(yTL: number, yTR: number, yBL: number, yBR: number): number[] {
        return [yTL, yTR, yBL, yBR]
    }
}
