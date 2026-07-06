import { AlarmTag, NotificationConfig, User } from "../features/central/models/billing.model";

export const ExampleUsers: User[] = [
    {
    id: 0,
    username: 'admin',
    password: 'admin123',
    role: 'administrator',
    pageAccess: ['Dashboard', 'Energy Monitoring', 'Reports', 'Settings', 'Alarm Management', 'User Management', 'Holiday Setting', 'Billing'],
    siteAccess: ['J2301-1', 'J2301-2', 'J2301-3', 'J2301-4', 'J2301-5']
    },
    {
    id: 1,
    username: 'demouser',
    password: '1234',
    role: 'administrator',
    pageAccess: ['Dashboard', 'Energy Monitoring', 'Reports', 'Settings', 'Alarm Management', 'User Management', 'Holiday Setting', 'Billing'],
    siteAccess: ['J2301-1', 'J2301-2', 'J2301-3', 'J2301-4', 'J2301-5']
    },
    {
    id: 2,
    username: 'operator1',
    password: 'op123',
    role: 'user',
    pageAccess: ['Dashboard', 'Energy Monitoring', 'Reports'],
    siteAccess: ['J2301-1', 'J2301-2', 'J2301-3', 'J2301-4', 'J2301-5']
    },
    {
    id: 3,
    username: 'viewer',
    password: 'view123',
    role: 'user',
    pageAccess: ['Dashboard', 'Reports'],
    siteAccess: ['J2301-1', 'J2301-2', 'J2301-3', 'J2301-4', 'J2301-5']
    }
];

export const ExampleAlarmTags: AlarmTag[] = [
    {
      id: 1,
      name: 'WeatherStation Com Fail',
      description: 'Alert when com fail',
      message: 'Weather Station connection lost',
      expression: 'WX.FCOMM > 0',
      tagSync: 'WX.FCOMM',
      destination: { telegram: true, msteam: false, email: false  }
    },
    {
      id: 2,
      name: 'PV temp',
      description: 'Alert when pv temp',
      message: 'PV Temp high temperature',
      expression: 'WX.PVTEMP > 0',
      tagSync: 'WX.PVTEMP',
      destination: { telegram: true, msteam: false, email: false  }
    },
    {
      id: 3,
      name: 'Pyrano Fault',
      description: 'Alert when pyrano fault',
      message: 'Pyrano fault',
      expression: 'WX.PYRANO > 0',
      tagSync: 'WX.PYRANO',
      destination: { telegram: true, msteam: false, email: false  }
    },
    {
      id: 4,
      name: 'PQM Com Fail',
      description: 'Alert when com fail',
      message: 'PQM connection lost',
      expression: 'PQM1.MBFAIL > 0',
      tagSync: 'PQM1.MBFAIL',
      destination: { telegram: true, msteam: false, email: false  }
    },
    {
      id: 5,
      name: 'Inverter Com Fail',
      description: 'Alert when com fail',
      message: 'Inverter connection lost',
      expression: 'INV.MBFAIL > 0',
      tagSync: 'INV.MBFAIL',
      destination: { telegram: true, msteam: false, email: false  }
    },
    {
      id: 6,
      name: 'Inverter Stop',
      description: 'Alert when stop',
      message: 'Inverter stop',
      expression: 'INV.HZ > 0',
      tagSync: 'INV.HZ',
      destination: { telegram: true, msteam: false, email: false  }
    },
    {
      id: 7,
      name: 'Inverter Fault',
      description: 'Alert when fault',
      message: 'Inverter fault',
      expression: 'INV.X_FAULT > 0',
      tagSync: 'INV.X_FAULT',
      destination: { telegram: true, msteam: false, email: false  }
    }
];

export const ExampleNotification: NotificationConfig = {
      email: {
        enabled: true,
        display: false,
        address: [
          'test@gmail.com', 
          // '987654321', 
          // '555555555'
        ]
      },
      telegram: {
        enabled: false,
        display: false,
        chatIds: [
          '123456789', 
          // '987654321', 
          // '555555555'
        ]
      },
      msteam: {
        enabled: false,
        display: false,
        webhookUrls: [
          'https://outlook.office.com/webhook/xxxxx',
          // 'https://outlook.office.com/webhook/yyyyy'
        ]
      }
    };