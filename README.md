# homebridge-mi-humidifier

[![version](https://img.shields.io/npm/v/homebridge-mi-humidifier.svg)](https://www.npmjs.com/package/homebridge-mi-humidifier)
![downloads](https://img.shields.io/npm/dt/homebridge-mi-humidifier.svg)

A Xiaomi Mi humidifier plugin for Homebridge.

### Example config

```json
{
  "bridge": {
    "name": "Homebridge",
    "username": "CC:22:3D:E4:CE:30",
    "port": 51826,
    "pin": "031-45-154"
  },
  "platforms": [],
  "accessories": [
    {
      "accessory": "MiHumidifier",
      "name": "Bedroom Humidifier",
      "ip": "192.168.x.x",
      "token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "model": "v1",
      "temperature": {
        "name": "Bedroom Temperature 1"
      },
      "humidity": true
    }
  ]
}
```

### Humidifier configuration

- `ip` – the device IP address;
- `token` – the device token (32 hex chars);
- `model` – the model of the humidifier. Either `v1` for Smartmi Humidifier or `ca1` for Smartmi Evaporative Humidifier;
- `name` (optional) – the name of the device. Defaults to 'Humidifier';
- `temperature` (optional) – if defined, the temperature sensor will be added. Can be either boolean or object with properties:
    - `name` – the name of the sensor. Defaults to 'Temperature';
- `humidity` (optional) – if defined, the humidity sensor will be added. Can be either boolean or object with properties:
    - `name` – the name of the sensor. Defaults to 'Humidity'.
