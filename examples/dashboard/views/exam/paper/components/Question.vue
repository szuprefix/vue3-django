<script setup>
import { computed, ref, watch } from 'vue'
import { ElRadioGroup, ElRadio, ElCheckboxGroup, ElCheckbox, ElInput } from 'element-plus'
import MarkupText from './MarkupText.vue'
const props = defineProps({
  question: { type: Object, required: true },
  showAnswer: Boolean,
  imageBase: String,
  audioBase: String,
})
const emit = defineEmits(['focus', 'answer'])
const user = ref([])
watch(
  () => props.question,
  (q) => {
    user.value = [...(q.userAnswer ?? [])]
  },
  { immediate: true },
)
const answers = computed(() => (props.showAnswer ? (props.question.answer ?? []) : user.value))
const choice = computed({ get: () => answers.value[0] ?? '', set: (value) => update(0, value) })
const multiple = computed({
  get: () => String(answers.value[0] ?? '').split(''),
  set: (value) => update(0, value.sort().join('')),
})
function update(index, value) {
  if (props.showAnswer) return
  user.value[index] = value
  emit('answer', { id: props.question.id, values: [...user.value] })
}
const markup = computed(() => ({ imageBase: props.imageBase, audioBase: props.audioBase }))
</script>
<template>
  <div
    class="paper-question"
    :data-question-id="question.id"
    @click="emit('focus', question)"
  >
    <div class="question-title">
      <strong>{{ question.number }}.</strong>
      <template v-if="question.inputs?.length">
        <template
          v-for="(part, index) in question.inputs"
          :key="index"
        >
          <br v-if="part.type === 'line'" />
          <ElInput
            v-else-if="part.type === 'input'"
            class="blank-input"
            :model-value="
              Array.isArray(answers[part.index])
                ? answers[part.index].join(' | ')
                : answers[part.index]
            "
            :readonly="showAnswer"
            :aria-label="`第${question.number}题第${part.index + 1}空`"
            @update:model-value="update(part.index, $event)"
          />
          <ElRadioGroup
            v-else-if="part.type === 'choices'"
            :model-value="answers[part.index]"
            @update:model-value="update(part.index, $event)"
          >
            <ElRadio
              v-for="option in part.options"
              :key="option.value"
              :value="option.value"
            >
              {{ option.text }}
            </ElRadio>
          </ElRadioGroup>
          <MarkupText
            v-else
            :text="part.value"
            v-bind="markup"
          />
        </template>
      </template>
      <MarkupText
        v-else
        :text="question.title"
        v-bind="markup"
      />
    </div>
    <ElRadioGroup
      v-if="['single', 'judge', 'correct', 'interpret'].includes(question.type)"
      v-model="choice"
      class="question-options"
    >
      <ElRadio
        v-for="option in question.options"
        :key="option.value"
        :value="option.value"
      >
        <span v-if="question.options.length > 2">{{ option.value }}.</span>
        <MarkupText
          :text="option.text"
          v-bind="markup"
        />
      </ElRadio>
    </ElRadioGroup>
    <ElCheckboxGroup
      v-else-if="question.type === 'multiple'"
      v-model="multiple"
      class="question-options"
    >
      <ElCheckbox
        v-for="option in question.options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.value }}.
        <MarkupText
          :text="option.text"
          v-bind="markup"
        />
      </ElCheckbox>
    </ElCheckboxGroup>
    <div
      v-if="question.subOptions"
      class="nested-options"
    >
      <p
        v-for="option in question.subOptions"
        :key="option.value"
      >
        {{ option.value }}.
        <MarkupText
          :text="option.text"
          v-bind="markup"
        />
      </p>
      <ElInput
        v-for="(option, index) in question.options"
        :key="option.value"
        :model-value="answers[index]"
        :readonly="showAnswer"
        :aria-label="`选项${option.value}答案`"
        @update:model-value="update(index, $event)"
      />
    </div>
    <template v-if="['textarea', 'sentence', 'correct', 'interpret'].includes(question.type)">
      <div
        v-if="showAnswer"
        class="written-answer"
      >
        <MarkupText
          :text="
            answers
              .slice(['correct', 'interpret'].includes(question.type) ? 1 : 0)
              .flat()
              .join('\n')
          "
          v-bind="markup"
        />
      </div>
      <ElInput
        v-else
        type="textarea"
        :autosize="{ minRows: 2, maxRows: 12 }"
        :model-value="user[['correct', 'interpret'].includes(question.type) ? 1 : 0]"
        aria-label="作答"
        @update:model-value="
          update(['correct', 'interpret'].includes(question.type) ? 1 : 0, $event)
        "
      />
    </template>
    <template v-if="showAnswer">
      <div
        v-if="question.explanation"
        class="explanation"
      >
        题解：
        <MarkupText
          :text="question.explanation"
          v-bind="markup"
        />
      </div>
      <div
        v-if="question.outline"
        class="outline"
      >
        知识点：
        <MarkupText
          :text="question.outline"
          v-bind="markup"
        />
      </div>
      <div class="question-score">{{ question.score }}分</div>
    </template>
  </div>
</template>
<style scoped>
.paper-question {
  margin: 24px 16px 0;
  color: #111;
}
.question-title {
  font-weight: bold;
  line-height: 1.7;
  margin-bottom: 24px;
}
.question-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
}
.question-options :deep(.el-radio),
.question-options :deep(.el-checkbox) {
  height: auto;
  min-height: 32px;
  margin-right: 0;
}
.question-options :deep(.el-radio__label),
.question-options :deep(.el-checkbox__label) {
  white-space: normal;
  font-weight: 600;
}
.blank-input {
  width: 150px;
  margin: 0 4px;
}
.written-answer {
  color: var(--el-color-primary);
  border: 1px solid var(--el-border-color);
  padding: 8px;
}
.explanation {
  color: #888;
  line-height: 1.5;
}
.outline {
  color: purple;
}
.question-score {
  text-align: right;
  color: #999;
  font-size: 12px;
}
</style>
