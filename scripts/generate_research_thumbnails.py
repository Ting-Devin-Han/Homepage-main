from pathlib import Path

from PIL import Image, ImageFile, ImageOps, ImageSequence


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "images" / "research_figures"
OUTPUT_DIR = ROOT / "images" / "research_thumbnails"
MAX_SIZE = (1200, 800)
ANIMATED_MAX_SIZE = (640, 400)
SOURCES = (
    "susceptibility.jpg", "HoloWorld.jpg", "TII4-0709.jpg", "BED.jpg",
    "NeuroComp.png", "TMFF.jpg", "BAT.gif", "PhyDAWS.jpg", "Road.png",
    "MajutsuCity.png", "Time2General.png", "FACADE.png", "SGS-3D.png",
    "accident.jpg", "GBA-UBF.jpg", "Vireo.png", "LiDAR-DHMT.jpg",
    "tree_ins.png", "CLIP4Geo.png", "PASeg.png", "DepthForge.jpg",
    "DiPFormer.png", "CityInsight.png", "BAE.png", "SIGIR.jpg",
    "Scene4U.gif", "CSFNet.gif", "HSPFormer.gif", "EdgeFirst.png",
    "ASGFormer.gif", "Chat3D.jpg", "SurveyZhiyunZhuang.png", "Epurate.gif",
)


def main() -> None:
    ImageFile.LOAD_TRUNCATED_IMAGES = True
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for filename in SOURCES:
        source = SOURCE_DIR / filename
        with Image.open(source) as image:
            if getattr(image, "is_animated", False):
                destination = OUTPUT_DIR / f"{source.stem}-animated.webp"
                default_duration = image.info.get("duration", 100)
                durations = []
                frames = []

                for frame in ImageSequence.Iterator(image):
                    thumbnail = frame.convert("RGB")
                    thumbnail.thumbnail(ANIMATED_MAX_SIZE, Image.Resampling.LANCZOS)
                    frames.append(thumbnail.copy())
                    durations.append(frame.info.get("duration", default_duration))

                frames[0].save(
                    destination,
                    "WEBP",
                    save_all=True,
                    append_images=frames[1:],
                    duration=durations,
                    loop=image.info.get("loop", 0),
                    quality=72,
                    method=4,
                    minimize_size=True,
                )
            else:
                destination = OUTPUT_DIR / f"{source.stem}.webp"
                image.seek(0)
                thumbnail = ImageOps.exif_transpose(image).convert("RGB")
                thumbnail.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)
                thumbnail.save(destination, "WEBP", quality=82, method=6)
        print(f"{source.name} -> {destination.name} ({destination.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
