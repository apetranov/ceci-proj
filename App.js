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

export default function App() {
  const [db, setDb] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [newTitle, setNewTitle] = useState("");

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 30,
      paddingTop: 100,
      backgroundColor: "#fff",
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
    taskItem: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    taskText: { fontSize: 16 },
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
          done INT
        )
      `);
      fetchTasks(database);
    };
    initDb();
  }, []);

  const fetchTasks = async (database = db) => {
    if (!database) return;
    const rows = await database.getAllSync("SELECT * FROM tasks");
    setTasks(rows);
  };

  const addTask = async () => {
    if (Platform.OS === "web") {
      setTasks([...tasks, { id: Date.now(), title, done: 0 }]);
      setTitle("");
      return;
    }
    if (!db || title.trim().length === 0) return;
    await db.runAsync("INSERT INTO tasks (title, done) VALUES (?, ?)", [
      title,
      0,
    ]);
    setTitle("");
    fetchTasks();
  };

  const deleteTask = async (id) => {
    if (Platform.OS === "web") {
      setTasks((prev) => prev.filter((task) => task.id !== id));
      return;
    }

    if (!db) return;
    await db.runAsync("DELETE FROM tasks WHERE id = ?", [id]);
    fetchTasks();
  };

  const updateTask = async (id, title) => {
    if (Platform.OS === "web") {
      setTasks((prev) =>
        prev.map((task) => (task.id === id ? { ...task, title } : task))
      );
      setModalVisible(false);
      return;
    }

    if (!db) return;
    await db.runAsync("UPDATE tasks SET title = ? WHERE id = ?", [title, id]);
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
    setModalVisible(true);
  };

  const renderItem = ({ item }) => {
    return (
      <View style={styles.taskItem}>
        <TouchableOpacity
          onPress={() => toggleTask(item.id, item.done)}
          style={{ flex: 1 }}
        >
          <Text style={[styles.taskText, item.done ? styles.taskDone : null]}>
            {item.title}
          </Text>
        </TouchableOpacity>

        <Button title="Update" onPress={() => openEditModal(item)} />
        <Button title="Delete" onPress={() => deleteTask(item.id)} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Offline Task Manager</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Enter task"
          value={title}
          onChangeText={setTitle}
        />
        <Button title="Add" onPress={addTask} />
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No tasks yet</Text>}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text
              style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}
            >
              Edit Task
            </Text>

            <TextInput
              style={styles.modalInput}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus={true}
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 15,
              }}
            >
              <Button
                title="Update"
                onPress={() => updateTask(currentTask.id, newTitle)}
              />
              <Button
                title="Cancel"
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
