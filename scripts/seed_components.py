"""
Seed the component database with common parts.
Usage: python scripts/seed_components.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "api"))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models.db_models import ComponentDB

DATABASE_URL = settings.database_url

COMPONENTS = [
    # Resistors
    dict(mpn="RC0402FR-0710KL", manufacturer="Yageo", description="10kΩ 1% Resistor 1/16W", type="resistor", value="10k", package="0402", specs={"resistance": "10k", "tolerance": "1%", "power": "1/16W"}),
    dict(mpn="RC0402FR-07100KL", manufacturer="Yageo", description="100kΩ 1% Resistor 1/16W", type="resistor", value="100k", package="0402", specs={"resistance": "100k", "tolerance": "1%"}),
    dict(mpn="RC0402FR-07330RL", manufacturer="Yageo", description="330Ω 1% Resistor 1/16W", type="resistor", value="330", package="0402", specs={"resistance": "330", "tolerance": "1%"}),
    dict(mpn="RC0402FR-07470RL", manufacturer="Yageo", description="470Ω 1% Resistor 1/16W", type="resistor", value="470", package="0402", specs={"resistance": "470"}),
    # Capacitors
    dict(mpn="GRM155R71C104KA88D", manufacturer="Murata", description="100nF 16V X7R Capacitor", type="capacitor", value="100nF", package="0402", specs={"capacitance": "100nF", "voltage": "16V", "dielectric": "X7R"}),
    dict(mpn="GRM188R60J106KE47D", manufacturer="Murata", description="10µF 6.3V X5R Capacitor", type="capacitor", value="10uF", package="0603", specs={"capacitance": "10uF", "voltage": "6.3V", "dielectric": "X5R"}),
    dict(mpn="GRM21BR61A106KE18L", manufacturer="Murata", description="10µF 10V X5R Capacitor", type="capacitor", value="10uF", package="0805", specs={"capacitance": "10uF", "voltage": "10V"}),
    # Voltage Regulators
    dict(mpn="AMS1117-3.3", manufacturer="AMS", description="3.3V 1A LDO Voltage Regulator", type="voltage_regulator", value="AMS1117-3.3", package="SOT-223", kicad_symbol="Regulator_Linear:AMS1117-3.3", specs={"vout": "3.3V", "iout_max": "1A", "vin_max": "15V"}),
    dict(mpn="AMS1117-5.0", manufacturer="AMS", description="5V 1A LDO Voltage Regulator", type="voltage_regulator", value="AMS1117-5.0", package="SOT-223", specs={"vout": "5V", "iout_max": "1A"}),
    dict(mpn="MCP1700T-3302E/TT", manufacturer="Microchip", description="3.3V 250mA Ultra-Low Quiescent LDO", type="voltage_regulator", value="MCP1700-3.3", package="SOT-23", specs={"vout": "3.3V", "iout_max": "250mA", "iq": "1.6uA"}),
    # Op-Amps
    dict(mpn="LM358DR", manufacturer="TI", description="Dual 1MHz Op-Amp", type="opamp", value="LM358", package="SOIC-8", specs={"gbw": "1MHz", "supply_max": "32V"}),
    dict(mpn="MCP6002T-I/SN", manufacturer="Microchip", description="1MHz Single Supply Op-Amp", type="opamp", value="MCP6002", package="SOIC-8", specs={"gbw": "1MHz", "supply_min": "1.8V", "supply_max": "5.5V"}),
    # Transistors
    dict(mpn="BC847BLT1G", manufacturer="ON Semi", description="NPN General Purpose Transistor", type="bjt", value="BC847B", package="SOT-23", specs={"vceo": "45V", "ic_max": "100mA", "hfe": "200-450"}),
    dict(mpn="2N7002LT1G", manufacturer="ON Semi", description="N-Channel MOSFET 60V 115mA", type="mosfet", value="2N7002", package="SOT-23", specs={"vds_max": "60V", "id_max": "115mA", "rds_on": "7.5Ω"}),
    # LEDs
    dict(mpn="TLHR5400", manufacturer="Vishay", description="Red LED 5mm Through-Hole", type="led", value="Red LED", package="LED-5mm", specs={"color": "red", "vf": "2.1V", "iv": "10mcd"}),
    dict(mpn="APT2012LZGCK", manufacturer="Kingbright", description="Green LED 0805 SMD", type="led", value="Green LED", package="0805", specs={"color": "green", "vf": "2.1V"}),
    # Connectors
    dict(mpn="22-28-4023", manufacturer="Molex", description="2-pin 0.1\" Header", type="connector", value="2-pin Header", package="PinHeader-1x02", specs={"pins": "2", "pitch": "2.54mm"}),
    dict(mpn="22-28-4043", manufacturer="Molex", description="4-pin 0.1\" Header", type="connector", value="4-pin Header", package="PinHeader-1x04", specs={"pins": "4", "pitch": "2.54mm"}),
    # Crystal
    dict(mpn="ABLS-8.000MHZ-B4-T", manufacturer="ABRACON", description="8MHz Crystal HC-49S SMD", type="crystal", value="8MHz", package="HC-49S-SMD", specs={"frequency": "8MHz", "load_cap": "18pF", "accuracy": "±30ppm"}),
]


async def seed() -> None:
    engine = create_async_engine(DATABASE_URL, echo=False)
    AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as session:
        for comp_data in COMPONENTS:
            mpn = comp_data["mpn"]
            res = await session.execute(select(ComponentDB).where(ComponentDB.mpn == mpn))
            if res.scalar_one_or_none() is None:
                session.add(ComponentDB(**comp_data))
        await session.commit()
        print(f"Seeded {len(COMPONENTS)} components.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
