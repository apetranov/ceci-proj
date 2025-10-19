import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from "react-native";
import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function App() {
  const [db, setDb] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [time, setTime] = useState("");
  const [newTime, setNewTime] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 30,
      paddingTop: 100,
      backgroundColor: "#ffffffff",
    },
    heading: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
    inputRow: { flexDirection: "row", marginBottom: 10 },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: "#ccc",
      marginRight: 10,
      padding: 8,
      borderRadius: 5,
    },
    taskItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
      padding: 12,
      backgroundColor: "#ffffff", // white card
      borderRadius: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2, // for Android shadow
    },
    taskText: {
      flex: 1,
      fontSize: 16,
    },
    taskDone: { textDecorationLine: "line-through", color: "gray" },
    empty: { textAlign: "center", marginTop: 20, fontSize: 16, color: "gray" },
    modalContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#00000099",
    },
    modalContent: {
      backgroundColor: "#fff",
      padding: 20,
      borderRadius: 10,
      width: "80%",
    },
    modalInput: {
      borderWidth: 1,
      borderColor: "#ccc",
      padding: 8,
      borderRadius: 5,
      backgroundColor: "#fff",
      fontSize: 16,
    },
    taskListContainer: {
      flex: 1,
      marginTop: 20,
      padding: 10,
      backgroundColor: "#f5f5f5", // light gray background
      borderRadius: 10,
    },
  });

  // Initialize DB
  useEffect(() => {
    const initDb = async () => {
      const database = await SQLite.openDatabaseSync("tasks.db");
      setDb(database);

      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT,
          time TEXT,
          done INT
        )
      `);

      // await database.execAsync("ALTER TABLE tasks ADD COLUMN time TEXT");
      fetchTasks(database);
    };
    initDb();
  }, []);

  const fetchTasks = async (database = db) => {
    if (!database) return;
    const rows = await database.getAllSync("SELECT * FROM tasks");

    // Sort tasks by time (HH:MM)
    const sorted = rows.sort((a, b) => {
      const [aH, aM] = a.time.split(":").map(Number);
      const [bH, bM] = b.time.split(":").map(Number);
      return aH * 60 + aM - (bH * 60 + bM);
    });

    setTasks(sorted);
  };

  const addTask = async () => {
    if (Platform.OS === "web") {
      const updatedTasks = [...tasks, { id: Date.now(), title, time, done: 0 }];
      updatedTasks.sort((a, b) => {
        const [aH, aM] = a.time.split(":").map(Number);
        const [bH, bM] = b.time.split(":").map(Number);
        return aH * 60 + aM - (bH * 60 + bM);
      });
      setTasks(updatedTasks);
      setTitle("");
      setTime("");
      return;
    }

    if (!db || title.trim().length === 0 || time.trim().length === 0) return;

    await db.runAsync(
      "INSERT INTO tasks (title, time, done) VALUES (?, ?, ?)",
      [title, time, 0]
    );

    setTitle("");
    setTime("");
    fetchTasks();
  };

  const deleteTask = async (id) => {
    if (Platform.OS === "web") {
      setTasks((prev) => prev.filter((task) => task.id !== id));
      setModalVisible(false);
      setCurrentTask(null); // reset currentTask
      return;
    }

    if (!db) return;
    await db.runAsync("DELETE FROM tasks WHERE id = ?", [id]);
    fetchTasks();
    setModalVisible(false);
    setCurrentTask(null); // reset currentTask
  };

  const updateTask = async (id, title, time) => {
    if (Platform.OS === "web") {
      const updated = tasks.map((task) =>
        task.id === id ? { ...task, title, time } : task
      );

      updated.sort((a, b) => {
        const [aH, aM] = a.time.split(":").map(Number);
        const [bH, bM] = b.time.split(":").map(Number);
        return aH * 60 + aM - (bH * 60 + bM);
      });

      setTasks(updated);
      setModalVisible(false);
      return;
    }

    if (!db) return;
    await db.runAsync("UPDATE tasks SET title = ?, time = ? WHERE id = ?", [
      title,
      time,
      id,
    ]);
    fetchTasks();
    setModalVisible(false);
  };

  const toggleTask = async (id, done) => {
    if (Platform.OS === "web") {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id ? { ...task, done: done ? 0 : 1 } : task
        )
      );
      return;
    }

    if (!db) return;
    await db.runAsync("UPDATE tasks SET done = ? WHERE id = ?", [
      done ? 0 : 1,
      id,
    ]);
    fetchTasks();
  };

  const openEditModal = (task) => {
    setCurrentTask(task);
    setNewTitle(task.title);
    setNewTime(task.time);
    setModalVisible(true);
  };

  const renderItem = ({ item }) => (
    <View style={styles.taskItem}>
      <TouchableOpacity onPress={() => openEditModal(item)} style={{ flex: 1 }}>
        <Text style={[styles.taskText, item.done ? styles.taskDone : null]}>
          {item.title} — {item.time}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* <Text style={styles.heading}>Offline Task Manager</Text> */}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Въведи услуга..."
          value={title}
          onChangeText={setTitle}
        />
      </View>

      <View style={{ marginTop: 10 }}>
        <TouchableOpacity
          onPress={() => setShowPicker(true)}
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            padding: 10,
            borderRadius: 5,
            backgroundColor: "#fff",
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 16 }}>
            {time ? `Час: ${time}` : "Избери час..."}
          </Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={(event, date) => {
              setShowPicker(false);
              if (date) {
                const formatted = date.toTimeString().slice(0, 5); // "HH:MM"
                setSelectedTime(date);
                setTime(formatted);
              }
            }}
          />
        )}

        <Button
          title="Добави"
          onPress={addTask}
          disabled={title.trim().length === 0 || time.trim().length === 0}
        />
      </View>

      <View style={styles.taskListContainer}>
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.empty}>Все още няма услуги...</Text>
          }
        />
      </View>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text
              style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}
            >
              Редактирай услуга
            </Text>

            {/* Title input */}
            <TextInput
              style={styles.modalInput}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus={true}
            />

            {/* TIME PICKER SECTION */}
            <TouchableOpacity
              style={styles.modalInput}
              onPress={() => setShowTimePicker(true)}
            >
              <Text>{newTime ? newTime : "Избери час..."}</Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, selectedTime) => {
                  setShowTimePicker(false);
                  if (selectedTime) {
                    const hours = selectedTime
                      .getHours()
                      .toString()
                      .padStart(2, "0");
                    const minutes = selectedTime
                      .getMinutes()
                      .toString()
                      .padStart(2, "0");
                    setNewTime(`${hours}:${minutes}`);
                  }
                }}
              />
            )}
            {/* END TIME PICKER SECTION */}

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 15,
              }}
            >
              <Button
                title="Промени"
                onPress={() => updateTask(currentTask.id, newTitle, newTime)}
              />
              <Button
                title="Изтрий"
                onPress={() => deleteTask(currentTask.id)}
              />
              <Button
                title="Отказ"
                onPress={() => setModalVisible(false)}
                color="red"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
