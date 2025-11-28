# Exporting SVG from Adobe Illustrator for React Native

## Quick Answer: YES, Export as Code!

When exporting from Illustrator, you want the **SVG code/text file**, not an image file.

## Step-by-Step Instructions

### 1. Select Your Artwork
- Select the logo/icon you want to export
- Make sure it's the final version (no hidden layers, etc.)

### 2. Export as SVG
- **File → Export → Export As...** (NOT "Save As")
- Choose **SVG** as the format
- Click "Export"

### 3. Configure SVG Options

In the SVG Options dialog, use these settings:

#### **Styling**
- ✅ **Presentation Attributes** (recommended)
- OR **CSS Properties** (also works)

#### **Font**
- ✅ **Convert to Outlines** (safest - converts text to paths)
- OR **SVG** (if you want to keep text editable)

#### **Images**
- ✅ **Embed** (includes images in the SVG)

#### **Object IDs**
- ✅ **Minimal** (removes unnecessary IDs)
- OR **None** (even cleaner)

#### **Decimal Places**
- ✅ **1** or **2** (reduces file size, 1 is usually enough)

#### **Minify**
- ✅ **Yes** (removes whitespace, smaller file)

#### **Responsive**
- ✅ **Yes** (removes fixed width/height, keeps viewBox)

#### **CSS Properties**
- ✅ **Presentation Attributes** (works best with React Native)

### 4. Verify the Export

After exporting:
1. Open the `.svg` file in a **text editor** (VS Code, Notepad, etc.)
2. You should see **XML/SVG code** like:
   ```svg
   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">
     <path d="M10 10 L90 10..." fill="#000000"/>
   </svg>
   ```
3. If you see binary/gibberish, you exported wrong - try again!

### 5. Clean Up for React Native

After exporting, you may want to:

1. **Remove XML declaration** (first line):
   ```svg
   ❌ <?xml version="1.0" encoding="UTF-8"?>
   ✅ (remove this line)
   ```

2. **Replace fixed colors with `currentColor`**:
   ```svg
   ❌ fill="#000000"
   ✅ fill="currentColor"
   ```
   This allows you to control color via props in React Native.

3. **Remove comments**:
   ```svg
   ❌ <!-- Generator: Adobe Illustrator ... -->
   ✅ (remove)
   ```

4. **Remove `id` attributes** (if not needed):
   ```svg
   ❌ <path id="path-1" d="..."/>
   ✅ <path d="..."/>
   ```

## Example: Before and After

### Before (from Illustrator):
```svg
<?xml version="1.0" encoding="UTF-8"?>
<!-- Generator: Adobe Illustrator 30.0.0 -->
<svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="100" height="50">
  <path id="path-1" d="M10 10 L90 10..." fill="#000000"/>
</svg>
```

### After (for React Native):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">
  <path d="M10 10 L90 10..." fill="currentColor"/>
</svg>
```

## Using in React Native

Once you have the cleaned SVG code:

1. **Save it** in `apps/mobile/assets/your-icon.svg`
2. **Create a component** in `apps/mobile/components/YourIcon.js`:
   ```javascript
   import React from 'react';
   import Svg, { Path } from 'react-native-svg';

   export function YourIcon({ width = 100, height = 50, color = '#000' }) {
     return (
       <Svg width={width} height={height} viewBox="0 0 100 50">
         <Path d="M10 10 L90 10..." fill={color} />
       </Svg>
     );
   }
   ```
3. **Use it**:
   ```javascript
   import { YourIcon } from './components/YourIcon';
   
   <YourIcon width={200} height={100} color="#ffffff" />
   ```

## Common Mistakes

❌ **Saving as "SVG" using Save As** - This might save as binary
✅ **Use Export → Export As → SVG**

❌ **Keeping fixed width/height** - Makes it non-responsive
✅ **Use Responsive option** (keeps viewBox, removes width/height)

❌ **Using fixed colors** - Can't change color dynamically
✅ **Use `currentColor`** for fills/strokes you want to control

❌ **Too many decimal places** - Larger file size
✅ **Use 1-2 decimal places**

## Need Help?

If your SVG doesn't work:
1. Check it opens in a text editor (should see code)
2. Verify it starts with `<svg` (not binary)
3. Make sure `viewBox` is present
4. Check for any unsupported features (filters, complex gradients, etc.)

