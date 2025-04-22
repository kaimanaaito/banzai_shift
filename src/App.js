import { useState, useEffect } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import html2canvas from "html2canvas";
import "./App.css";

// ユーティリティ関数
const loadFromLocalStorage = (key, defaultValue) => {
  const saved = localStorage.getItem(key);
  return saved !== null ? JSON.parse(saved) : defaultValue;
};

const saveToLocalStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const getStartOfWeek = (date) => {
  const newDate = new Date(date);
  const day = newDate.getDay();
  const diff = newDate.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(newDate.setDate(diff));
};

const getWeekDisplayString = (date) => {
  const start = new Date(date);
  const end = new Date(date);
  end.setDate(end.getDate() + 5);
  return `${start.getMonth() + 1}月${start.getDate()}日 〜 ${
    end.getMonth() + 1
  }月${end.getDate()}日`;
};

const getEmployeeName = (employees, id) => {
  const emp = employees.find((e) => e.id === id);
  return emp ? emp.name : "不明";
};

const formatHour = (hour) => {
  return `${hour}:00`;
};

// データ検証関数
const validateScheduleData = (data, validEmployeeIds) => {
  const validated = {};
  Object.keys(data).forEach((day) => {
    validated[day] = {};
    Object.keys(data[day]).forEach((hour) => {
      validated[day][hour] = data[day][hour].filter((id) =>
        validEmployeeIds.includes(id)
      );
    });
  });
  return validated;
};

// 画像エクスポートコンポーネント
const ExportImageButton = ({ targetId }) => {
  const handleExport = async () => {
    try {
      const element = document.getElementById(targetId);
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
      });

      const link = document.createElement("a");
      link.download = `shift_${new Date().toLocaleDateString("ja-JP")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("画像生成エラー:", error);
      alert("画像の生成に失敗しました");
    }
  };

  return (
    <button onClick={handleExport} className="export-button">
      📷 Save as picture
    </button>
  );
};

// ドラッグ可能な従業員チップ
const EmployeeChip = ({ empId, name, onDrop, currentDay, currentHour }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "EMPLOYEE",
    item: {
      empId,
      originalDay: currentDay,
      originalHour: currentHour,
    },
    end: (item, monitor) => {
      if (!monitor.didDrop()) {
        onDrop(item.empId, null, null, item.originalDay, item.originalHour);
      }
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className="employee-chip"
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: "move",
      }}
    >
      {name}
    </div>
  );
};

// ドロップ可能なセル
const ScheduleCell = ({
  day,
  hour,
  employees,
  onDrop,
  onRemove,
  allEmployees,
}) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "EMPLOYEE",
    drop: (item) =>
      onDrop(item.empId, day, hour, item.originalDay, item.originalHour),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  return (
    <td
      ref={drop}
      className="td"
      style={{
        backgroundColor: isOver ? "#f0fdf4" : "inherit",
      }}
    >
      <div className="min-h-8">
        {employees.map((empId) => {
          const emp = allEmployees.find((e) => e.id === empId);
          return emp ? (
            <div key={empId} className="employee-chip-container">
              <EmployeeChip
                empId={empId}
                name={emp.name}
                onDrop={onRemove}
                currentDay={day}
                currentHour={hour}
              />
            </div>
          ) : null;
        })}
        {employees.length === 0 && (
          <div className="text-red-500 text-xs">※No stuff</div>
        )}
      </div>
    </td>
  );
};

// メインコンポーネント
export default function ShiftScheduler() {
  const [employees, setEmployees] = useState(() => {
    const saved = loadFromLocalStorage("shift-employees", [
      { id: 1, name: "Joey Swanger" },
      { id: 2, name: "Mallory Coleman" },
      { id: 3, name: "Mathew Henman " },
      { id: 4, name: "Skyler-Bailey Manapat" },
      { id: 5, name: "Sarah Banfield" },
    ]);
    return saved;
  });

  const days = ["月", "火", "水", "木", "金", "土"];
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = Array.from({ length: 15 }, (_, i) => i + 9);

  const createInitialAvailability = () => {
    const initAvailability = {};
    employees.forEach((emp) => {
      initAvailability[emp.id] = {};
      days.forEach((day) => {
        initAvailability[emp.id][day] = {};
        hours.forEach((hour) => {
          initAvailability[emp.id][day][hour] = false;
        });
      });
    });
    return initAvailability;
  };

  const [availability, setAvailability] = useState(() => {
    const saved = loadFromLocalStorage("shift-availability", {});
    const defaultData = createInitialAvailability();
    return { ...defaultData, ...saved };
  });

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState(() => {
    const saved = loadFromLocalStorage("shift-schedule", {});
    return validateScheduleData(
      saved,
      employees.map((e) => e.id)
    );
  });
  const [currentView, setCurrentView] = useState("input");
  const [selectedWeek, setSelectedWeek] = useState(getStartOfWeek(new Date()));
  const [maxStaffPerSlot, setMaxStaffPerSlot] = useState(2);
  const [newEmployeeName, setNewEmployeeName] = useState("");

  useEffect(() => {
    saveToLocalStorage("shift-employees", employees);
  }, [employees]);

  useEffect(() => {
    saveToLocalStorage("shift-availability", availability);
  }, [availability]);

  useEffect(() => {
    saveToLocalStorage("shift-schedule", generatedSchedule);
  }, [generatedSchedule]);

  const addEmployee = () => {
    if (!newEmployeeName.trim()) return;

    const newId =
      employees.length > 0 ? Math.max(...employees.map((e) => e.id)) + 1 : 1;
    const newEmployee = { id: newId, name: newEmployeeName.trim() };

    setEmployees([...employees, newEmployee]);

    setAvailability((prev) => {
      const newAvailability = { ...prev };
      newAvailability[newId] = {};
      days.forEach((day) => {
        newAvailability[newId][day] = {};
        hours.forEach((hour) => {
          newAvailability[newId][day][hour] = false;
        });
      });
      return newAvailability;
    });

    setNewEmployeeName("");
  };

  const removeEmployee = (id) => {
    if (!window.confirm(`${getEmployeeName(employees, id)}を削除しますか？`))
      return;

    setEmployees(employees.filter((emp) => emp.id !== id));

    setGeneratedSchedule((prev) => {
      const newSchedule = { ...prev };
      Object.keys(newSchedule).forEach((day) => {
        Object.keys(newSchedule[day]).forEach((hour) => {
          newSchedule[day][hour] = newSchedule[day][hour].filter(
            (empId) => empId !== id
          );
        });
      });
      return newSchedule;
    });
  };

  const handleEmployeeSelect = (empId) => {
    setSelectedEmployee(empId);
    setIsEditMode(true);
  };

  const toggleAvailability = (day, hour) => {
    if (!selectedEmployee || !isEditMode) return;

    setAvailability((prev) => {
      const newAvailability = JSON.parse(JSON.stringify(prev));

      // 初期化されていない場合に備えて安全にアクセス
      if (!newAvailability[selectedEmployee]) {
        newAvailability[selectedEmployee] = {};
      }
      if (!newAvailability[selectedEmployee][day]) {
        newAvailability[selectedEmployee][day] = {};
      }

      // 現在の状態を反転
      const current = newAvailability[selectedEmployee][day][hour] || false;
      newAvailability[selectedEmployee][day][hour] = !current;

      return newAvailability;
    });
  };

  const saveEmployeeAvailability = () => {
    setIsEditMode(false);
    setSelectedEmployee(null);
  };

  const generateSchedule = () => {
    const availableEmployeesPerSlot = {};

    days.forEach((day) => {
      availableEmployeesPerSlot[day] = {};
      hours.forEach((hour) => {
        availableEmployeesPerSlot[day][hour] = [];

        employees.forEach((emp) => {
          if (availability[emp.id]?.[day]?.[hour]) {
            availableEmployeesPerSlot[day][hour].push(emp.id);
          }
        });
      });
    });

    const schedule = {};
    const assignedHoursCount = {};

    employees.forEach((emp) => {
      assignedHoursCount[emp.id] = 0;
    });

    days.forEach((day) => {
      schedule[day] = {};

      hours.forEach((hour) => {
        schedule[day][hour] = (generatedSchedule[day]?.[hour] || []).filter(
          (empId) => availableEmployeesPerSlot[day][hour].includes(empId)
        );

        const availableEmps = availableEmployeesPerSlot[day][hour].filter(
          (empId) => !schedule[day][hour].includes(empId)
        );

        const sortedEmps = [...availableEmps].sort(
          (a, b) => assignedHoursCount[a] - assignedHoursCount[b]
        );

        const assignCount =
          maxStaffPerSlot > 0
            ? Math.min(
                maxStaffPerSlot - schedule[day][hour].length,
                sortedEmps.length
              )
            : sortedEmps.length;

        for (let i = 0; i < assignCount; i++) {
          schedule[day][hour].push(sortedEmps[i]);
          assignedHoursCount[sortedEmps[i]]++;
        }
      });
    });

    setGeneratedSchedule(schedule);
    setCurrentView("schedule");
  };

  const resetData = () => {
    if (
      window.confirm(
        "Do you want to reset all data? This operation cannot be undone."
      )
    ) {
      // スケジュールデータのみリセット
      setGeneratedSchedule({});
      localStorage.removeItem("shift-schedule");

      // 従業員データとavailabilityデータは保持
      const initialAvailability = createInitialAvailability();
      setAvailability(initialAvailability);
    }
  };

  const goToPreviousWeek = () => {
    const prevWeek = new Date(selectedWeek);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setSelectedWeek(prevWeek);
  };

  const goToNextWeek = () => {
    const nextWeek = new Date(selectedWeek);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setSelectedWeek(nextWeek);
  };

  const handleDrop = (empId, newDay, newHour, originalDay, originalHour) => {
    if (!newDay || !newHour) return;

    setGeneratedSchedule((prev) => {
      const newSchedule = JSON.parse(JSON.stringify(prev));

      if (originalDay && originalHour) {
        if (newSchedule[originalDay]?.[originalHour]) {
          newSchedule[originalDay][originalHour] = newSchedule[originalDay][
            originalHour
          ].filter((id) => id !== empId);
        }
      }

      if (!newSchedule[newDay]) newSchedule[newDay] = {};
      if (!newSchedule[newDay][newHour]) newSchedule[newDay][newHour] = [];

      if (
        maxStaffPerSlot > 0 &&
        newSchedule[newDay][newHour].length >= maxStaffPerSlot
      ) {
        alert(`1時間あたりの最大人数（${maxStaffPerSlot}人）を超えています`);
        return prev;
      }

      if (!newSchedule[newDay][newHour].includes(empId)) {
        newSchedule[newDay][newHour] = [...newSchedule[newDay][newHour], empId];
      }

      return newSchedule;
    });
  };

  const handleRemove = (empId) => {
    setGeneratedSchedule((prev) => {
      const newSchedule = { ...prev };
      Object.keys(newSchedule).forEach((day) => {
        Object.keys(newSchedule[day]).forEach((hour) => {
          newSchedule[day][hour] = newSchedule[day][hour].filter(
            (id) => id !== empId
          );
        });
      });
      return newSchedule;
    });
  };

  const isSelected = (day, hour) => {
    if (!selectedEmployee) return false;
    return availability[selectedEmployee]?.[day]?.[hour] || false;
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container">
        <header className="header">
          <h1 className="text-xl font-bold">Shift Scheduler</h1>
        </header>

        <main className="main">
          <div className="nav">
            <button onClick={goToPreviousWeek} className="button">
              last week
            </button>
            <h2 className="text-lg font-semibold">
              {getWeekDisplayString(selectedWeek)}
            </h2>
            <button onClick={goToNextWeek} className="button">
              next week
            </button>
          </div>

          <div className="employee-management mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-3">manage employee</h3>
            <div className="flex items-center mb-3">
              <input
                type="text"
                value={newEmployeeName}
                onChange={(e) => setNewEmployeeName(e.target.value)}
                placeholder="New stuff"
                className="flex-1 px-3 py-2 border rounded-l"
              />
              <button
                onClick={addEmployee}
                className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600"
              >
                add
              </button>
            </div>
            <div className="employee-list grid grid-cols-1 md:grid-cols-2 gap-2">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between p-2 bg-white rounded border"
                >
                  <span>{emp.name}</span>
                  <button
                    onClick={() => removeEmployee(emp.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <div className="tab-container">
              <div className="inline-flex rounded-md shadow-sm">
                <button
                  onClick={() => setCurrentView("input")}
                  className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                    currentView === "input"
                      ? "bg-green-500 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  shift input
                </button>
                <button
                  onClick={() =>
                    currentView === "schedule"
                      ? setCurrentView("schedule")
                      : generateSchedule()
                  }
                  className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                    currentView === "schedule"
                      ? "bg-green-500 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  show the shift
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <label htmlFor="maxStaff" className="mr-2 text-sm">
                  :Maximum number of people per hour
                </label>
                <input
                  id="maxStaff"
                  type="number"
                  min="1"
                  value={maxStaffPerSlot}
                  onChange={(e) =>
                    setMaxStaffPerSlot(parseInt(e.target.value) || 0)
                  }
                  className="w-16 px-2 py-1 border rounded text-sm"
                />
              </div>
              <button
                onClick={resetData}
                className="text-sm text-red-600 hover:text-red-800"
              >
                reset the data
              </button>
            </div>
          </div>

          {currentView === "input" ? (
            <div className="card bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-medium mb-4">
                Enter your available work hours
              </h2>

              {!isEditMode ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {employees.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => handleEmployeeSelect(emp.id)}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                    >
                      {emp.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div>
                  <h3 className="font-medium mb-2">
                    {getEmployeeName(employees, selectedEmployee)}
                    さんの勤務可能時間を選択
                  </h3>

                  <div className="table-container overflow-x-auto">
                    <table className="table w-full">
                      <thead>
                        <tr>
                          <th className="th py-2 px-3 text-left">time</th>
                          {dayLabels.map((label, index) => (
                            <th
                              key={days[index]}
                              className="th py-2 px-3 text-center"
                            >
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {hours.map((hour) => (
                          <tr key={hour} className="border-t">
                            <td className="td py-2 px-3 font-medium">
                              {formatHour(hour)}
                            </td>
                            {days.map((day) => (
                              <td
                                key={`${day}-${hour}`}
                                className="td py-2 px-3 text-center cursor-pointer"
                                onClick={() => toggleAvailability(day, hour)}
                              >
                                <div
                                  className={`w-6 h-6 mx-auto rounded-full ${
                                    isSelected(day, hour)
                                      ? "bg-green-500"
                                      : "bg-gray-200"
                                  }`}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end mt-4">
                    <button
                      onClick={saveEmployeeAvailability}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
                    >
                      save
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">Shift table</h2>
                <ExportImageButton targetId="schedule-table" />
              </div>

              <div
                className="table-container overflow-x-auto"
                id="schedule-table"
              >
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th className="th py-2 px-3 text-left">time</th>
                      {dayLabels.map((label, index) => (
                        <th
                          key={days[index]}
                          className="th py-2 px-3 text-center"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hours.map((hour) => (
                      <tr key={hour} className="border-t">
                        <td className="td py-2 px-3 font-medium">
                          {formatHour(hour)}
                        </td>
                        {days.map((day) => (
                          <ScheduleCell
                            key={`${day}-${hour}`}
                            day={day}
                            hour={hour}
                            employees={generatedSchedule[day]?.[hour] || []}
                            onDrop={handleDrop}
                            onRemove={handleRemove}
                            allEmployees={employees}
                          />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>

        <footer className="footer py-4 text-center text-gray-500 text-sm">
          Shift Scheduler © {new Date().getFullYear()}
        </footer>
      </div>
    </DndProvider>
  );
}
