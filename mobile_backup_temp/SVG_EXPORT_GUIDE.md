# SVG Export Settings for React Native

## Best Practices for Exporting SVGs for React Native

When exporting SVGs from design tools (Illustrator, Figma, Sketch, etc.) for use in React Native, follow these guidelines:

### 1. **Remove XML Declaration**
❌ Don't include: `<?xml version="1.0" encoding="UTF-8"?>`
✅ Start directly with: `<svg ...>`

### 2. **Use `currentColor` for Fills**
This allows you to control color via props:
```svg
<path fill="currentColor" ... />
```

Then in React Native:
```javascript
<MyIcon color="#ffffff" />
```

### 3. **Keep Essential Attributes**
✅ Keep: `viewBox`, `xmlns`
❌ Remove: `id`, `version`, `width`, `height` (set these via props)

### 4. **Remove Comments**
Remove any comments like `<!-- Generator: Adobe Illustrator ... -->`

### 5. **Simplify Paths**
- Use optimized paths (tools like SVGO can help)
- Remove unnecessary precision
- Combine overlapping paths when possible

### 6. **Example Clean SVG Format**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="currentColor" d="M12 2L2 7v10l10 5 10-5V7L12 2z"/>
</svg>
```

## Export Settings by Tool

### Adobe Illustrator
1. **File → Export → Export As → SVG** (NOT "Save As" - use Export!)
2. In the SVG Options dialog:
   - **Styling**: Presentation Attributes (or CSS Properties)
   - **Font**: Convert to Outlines (recommended) OR use system fonts
   - **Images**: Embed
   - **Object IDs**: Minimal (or None if possible)
   - **Decimal Places**: 1-2 (reduces file size)
   - **Minify**: Yes (removes whitespace)
   - **Responsive**: Yes (removes width/height, keeps viewBox)
   - **CSS Properties**: Presentation Attributes (better for React Native)
3. Click "OK" to export
4. **Open the exported .svg file in a text editor** to verify it's code (not binary)
5. You should see XML/SVG markup starting with `<svg` or `<svg xmlns`

### Figma
1. Right-click element → Copy/Paste as SVG
2. Or: Export → SVG
3. Settings:
   - **Include "id" attribute**: Off
   - **Simplify stroke**: On
   - **Use current color**: On (if available)

### Sketch
1. Make Exportable → Format: SVG
2. Export
3. Post-process to remove IDs and optimize

## Post-Export Cleanup

After exporting, you may want to:
1. Remove XML declaration
2. Replace `fill="#000000"` with `fill="currentColor"`
3. Remove `id` attributes
4. Remove comments
5. Optimize with SVGO (optional)

## Using SVGs in React Native

### Option 1: Component (Current Approach)
```javascript
import Svg, { Path } from 'react-native-svg';

export function MyIcon({ width = 24, height = 24, color = '#000' }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24">
      <Path fill={color} d="..." />
    </Svg>
  );
}
```

### Option 2: Transformer (When Working)
```javascript
import MyIcon from './assets/my-icon.svg';

<MyIcon width={24} height={24} color="#000" />
```

## Current Issue

The SVG native module needs to be properly linked. Once that's fixed, you can use either approach above.

