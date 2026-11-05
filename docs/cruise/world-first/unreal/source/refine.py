from pathlib import Path
_target=Path(__file__).parent/'vista.py'
exec(compile(_target.read_text(),str(_target),'exec'),globals())
